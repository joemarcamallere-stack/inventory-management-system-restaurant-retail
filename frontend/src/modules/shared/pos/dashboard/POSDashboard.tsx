import { useMemo, useState } from 'react';
import {
  BarChart3,
  ChefHat,
  Clock,
  CreditCard,
  ReceiptText,
  ShoppingBag,
  Table2,
  TrendingUp,
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
};

type RangeKey = 'today' | 'week' | 'month';

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(range: RangeKey) {
  const now = new Date();
  const start = new Date(now);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(now.getDate() - 29);
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
}: Props) {
  const [range, setRange] = useState<RangeKey>('week');
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
  const averageTicket = todaySummary?.averageTicket ?? 0;
  const paidToday = todaySummary?.transactionCount ?? 0;
  const chartData = salesTrend.map((point) => ({
    label: point.period.slice(5),
    sales: point.netSales,
  }));

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Monitor POS sales, open orders, payments, and item performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                range === item
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-card text-foreground hover:border-primary'
              }`}
            >
              {item === 'today' ? 'Today' : item === 'week' ? '7 Days' : '30 Days'}
            </button>
          ))}
          <button
            type="button"
            onClick={onCreateOrder}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
          >
            <ShoppingBag className="h-4 w-4" />
            New Order
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={TrendingUp} label="Net Sales" value={formatMoney(summary?.netSales ?? 0)} />
        <Metric icon={ReceiptText} label="Paid Orders Today" value={String(paidToday)} helper={`Avg ${formatMoney(averageTicket)}`} />
        <Metric icon={Clock} label="Open Orders" value={String(openOrders.length)} helper="Unpaid POS orders" />
        {module === 'RESTAURANT' ? (
          <Metric icon={Table2} label="Occupied Tables" value={`${occupiedTableCount}/${diningTables.length}`} helper={`${pendingKitchenCount} kitchen tickets`} />
        ) : (
          <Metric icon={CreditCard} label="Payment Types" value={String(paymentMethods.length)} helper="Active in range" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Sales Trend</h2>
              <p className="text-xs text-muted-foreground">Net sales for the selected range</p>
            </div>
            <button
              type="button"
              onClick={onOpenReports}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary"
            >
              <BarChart3 className="h-4 w-4" />
              Reports
            </button>
          </div>
          <div className="h-72">
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
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sales in this range yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-1 text-base font-semibold text-foreground">Top Items</h2>
          <p className="mb-4 text-xs text-muted-foreground">Best sellers by quantity</p>
          <div className="space-y-3">
            {topItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No item sales yet.</div>
            ) : (
              topItems.map((item, index) => (
                <div key={`${item.inventoryItemId}-${item.name}`} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantitySold} sold</p>
                  </div>
                  <p className="text-sm font-semibold text-primary">{formatMoney(item.grossSales)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Recent POS Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 font-medium text-foreground">{order.orderNumber}</td>
                    <td className="py-3 text-muted-foreground">{order.orderType.replace('_', ' ')}</td>
                    <td className="py-3 text-muted-foreground">{order.paymentStatus}</td>
                    <td className="py-3 text-right font-semibold text-foreground">{formatMoney(order.total)}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted-foreground">No POS orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              {module === 'RESTAURANT' ? 'Kitchen Queue' : 'Payment Mix'}
            </h2>
            {module === 'RESTAURANT' && onOpenKitchen && (
              <button
                type="button"
                onClick={onOpenKitchen}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary"
              >
                <ChefHat className="h-4 w-4" />
                Kitchen
              </button>
            )}
          </div>
          {module === 'RESTAURANT' ? (
            <div className="grid grid-cols-3 gap-3">
              {(['PENDING', 'PREPARING', 'READY'] as const).map((status) => (
                <div key={status} className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">{status}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {kitchenOrders.filter((order) => order.status === status).length}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No payments in this range yet.</div>
              ) : (
                paymentMethods.map((method) => (
                  <div key={method.paymentMethod} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{method.paymentMethod}</p>
                      <p className="text-xs text-muted-foreground">{method.transactionCount} transactions</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{formatMoney(method.grossSales)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
