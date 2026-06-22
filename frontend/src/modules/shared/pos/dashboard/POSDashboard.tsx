import { useMemo, useState } from 'react';
import {
  Calendar,
  ShoppingBag,
} from 'lucide-react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BusinessModule } from '../../../../app/api/domainTypes';
import {
  useDiningTablesQuery,
  useKitchenOrdersQuery,
  usePOSOrdersQuery,
  useSalesByItemQuery,
  useSalesByPaymentMethodQuery,
  useSalesByPeriodQuery,
  useSalesSummaryQuery,
} from '../../../lib/domainQueries';
import { formatMoney } from '../../money';

type Props = {
  module: BusinessModule;
  title: string;
  onCreateOrder: () => void;
  onOpenReports: () => void;
  onOpenKitchen?: () => void;
  showCreateOrder?: boolean;
};

type RangeKey = 'all' | 'today' | 'week' | 'month' | 'year';

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(range: RangeKey) {
  if (range === 'all') return {};
  const now = new Date();
  const start = new Date(now);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'month') {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(now.getMonth() - 11, 1);
    start.setHours(0, 0, 0, 0);
  }
  return { from: dateKey(start), to: dateKey(now) };
}

export function POSDashboard({
  module,
  title,
  onCreateOrder,
  onOpenReports,
  onOpenKitchen,
  showCreateOrder = true,
}: Props) {
  const [range, setRange] = useState<RangeKey>('today');
  const rangeQuery = useMemo(() => rangeFor(range), [range]);
  const todayQuery = useMemo(() => rangeFor('today'), []);

  const { data: summary } = useSalesSummaryQuery({ ...rangeQuery, module });
  const { data: todaySummary } = useSalesSummaryQuery({ ...todayQuery, module });
  const { data: salesTrend = [] } = useSalesByPeriodQuery({
    ...rangeQuery,
    module,
    granularity: 'day',
  });
  const { data: topItems = [] } = useSalesByItemQuery({
    ...rangeQuery,
    module,
    limit: 5,
  });
  const { data: paymentMethods = [] } = useSalesByPaymentMethodQuery({
    ...rangeQuery,
    module,
  });
  const { data: recentOrders = [] } = usePOSOrdersQuery({
    module,
    page: 1,
    limit: 6,
  });
  const { data: openOrders = [] } = usePOSOrdersQuery({
    module,
    paymentStatus: 'NOT_PAID',
    page: 1,
    limit: 50,
  });
  const { data: kitchenOrders = [] } = useKitchenOrdersQuery(undefined, {
    enabled: module === 'RESTAURANT',
  });
  const { data: diningTables = [] } = useDiningTablesQuery(undefined, {
    enabled: module === 'RESTAURANT',
  });

  const pendingKitchenCount = kitchenOrders.filter((order) =>
    ['PENDING', 'PREPARING', 'READY'].includes(order.status),
  ).length;
  const occupiedTableCount = diningTables.filter((table) => table.status === 'OCCUPIED').length;
  const paidToday = todaySummary?.transactionCount ?? 0;
  const chartData = salesTrend.map((point) => ({
    label: range === 'today' ? 'Today' : point.period.slice(5),
    sales: point.netSales,
  }));
  const dineInOrders = recentOrders.filter((order) => order.orderType === 'DINE_IN').length;
  const takeoutOrders = recentOrders.filter((order) => order.orderType === 'TAKEOUT').length;
  const totalOrders = recentOrders.length;

  return (
    <div className="min-h-full bg-[#f8fafb] p-8 font-['Inter',sans-serif]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight text-[#008967]">{title}</h1>
          <p className="mt-1 text-[15px] text-[#9a9fc0]">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        {showCreateOrder && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCreateOrder}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#008967] px-4 text-[14px] font-semibold text-white transition hover:bg-[#007a5e]"
            >
              <ShoppingBag className="h-4 w-4" />
              New Order
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Metric label="Total Sales Today" value={formatMoney(todaySummary?.netSales ?? 0)} />
        <Metric label={module === 'RESTAURANT' ? 'Orders Today' : 'Transactions Today'} value={String(paidToday)} helper={module === 'RESTAURANT' ? undefined : 'No sales yet'} />
        <Metric label={module === 'RESTAURANT' ? 'Active Orders' : 'Total Customers'} value={String(openOrders.length)} helper={module === 'RESTAURANT' ? undefined : 'All-time unique customers'} />
        {module === 'RESTAURANT' ? (
          <>
            <Metric label="Available Tables" value={`${Math.max(diningTables.length - occupiedTableCount, 0)} / ${diningTables.length}`} helper={`${occupiedTableCount} Occupied · 0 Maintenance`} />
            <Metric label="Customers Waiting" value={String(pendingKitchenCount)} helper={pendingKitchenCount > 0 ? 'Kitchen queue active' : 'No queue'} />
          </>
        ) : (
          <Metric label="Payment Types" value={String(paymentMethods.length)} helper="Active today" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.49fr]">
        <section className="rounded-[14px] border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-medium text-[#008967]">Sales Overview</h2>
            <div className="flex items-center gap-2">
              <button type="button" className="flex size-8 items-center justify-center rounded-[8px] border border-[#e2e8f0] text-[#008967]">
                <Calendar className="size-4" />
              </button>
              <select
                value={range}
                onChange={(event) => setRange(event.target.value as RangeKey)}
                className="h-8 rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-[13px] text-[#111827] outline-none"
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
          <div className="h-[220px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 8, right: 12, top: 12, bottom: 8 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={72} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Line type="monotone" dataKey="sales" stroke="#008967" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[14px] text-[#9a9fc0]">
                No sales yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[14px] border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-medium text-[#008967]">Top Selling Items</h2>
            <button type="button" onClick={onOpenReports} className="text-[12px] font-medium text-[#008967]">See all</button>
          </div>
          <div className="space-y-3">
            {topItems.length === 0 ? (
              <div className="py-24 text-center text-[14px] text-[#9a9fc0]">No item sales yet.</div>
            ) : (
              topItems.map((item, index) => (
                <div key={`${item.inventoryItemId}-${item.name}`} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#f1f5f9] text-sm font-semibold text-[#111827]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111827]">{item.name}</p>
                    <p className="text-xs text-[#9a9fc0]">{item.quantitySold} sold</p>
                  </div>
                  <p className="text-sm font-semibold text-[#008967]">{formatMoney(item.grossSales)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {module === 'RESTAURANT' && (
        <section className="mt-6 rounded-[14px] border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-[18px] font-medium text-[#008967]">Order Summary</h2>
          <div className="grid grid-cols-3 text-center">
            <SummaryCell label="Dine-in" value={dineInOrders} />
            <SummaryCell label="Take-out" value={takeoutOrders} />
            <SummaryCell label="Total Orders" value={totalOrders} last />
          </div>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6">
        <section className="rounded-[14px] border border-[#e2e8f0] bg-white shadow-sm">
          <h2 className="px-5 py-4 text-[18px] font-medium text-[#008967]">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f1f5f9] text-[13px] text-[#111827]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order ID</th>
                  <th className="px-4 py-3 font-semibold">Customer Name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Table</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f7]">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium text-[#111827]">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-[#111827]">{order.customerName || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-[#111827]">{order.orderType.replace('_', '-').toLowerCase()}</td>
                    <td className="px-4 py-3 text-[#111827]">{order.table?.tableNumber ?? order.tableName ?? '-'}</td>
                    <td className="px-4 py-3 text-[#111827]">{formatMoney(order.total)}</td>
                    <td className="px-4 py-3 text-[#111827]">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#111827]">{order.paymentStatus.replace('_', ' ')}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#9a9fc0]">No orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="min-h-[96px] rounded-[14px] border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <p className="mb-2 text-[15px] text-[#9a9fc0]">{label}</p>
      <p className="text-[26px] font-medium leading-tight text-[#008967]">{value}</p>
      {helper && <p className="mt-1 text-[13px] text-[#9a9fc0]">{helper}</p>}
    </div>
  );
}

function SummaryCell({ label, value, last = false }: { label: string; value: number; last?: boolean }) {
  return (
    <div className={`${last ? '' : 'border-r border-[#e2e8f0]'}`}>
      <p className="text-[13px] text-[#9a9fc0]">{label}</p>
      <p className="mt-2 text-[22px] text-[#008967]">{value}</p>
    </div>
  );
}
