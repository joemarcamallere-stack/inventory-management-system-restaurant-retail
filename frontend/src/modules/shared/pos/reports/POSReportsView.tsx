import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Download,
  Printer,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { BusinessModule } from '../../../../app/api/domainTypes';
import {
  useSalesByCashierQuery,
  useSalesByItemQuery,
  useSalesByLocationQuery,
  useSalesByOrderTypeQuery,
  useSalesByPaymentMethodQuery,
  useSalesByPeriodQuery,
  useSalesQuery,
  useSalesSummaryQuery,
} from '../../../lib/domainQueries';
import { formatMoney } from '../../money';

type DateMode = 'today' | 'week' | 'month' | 'year' | 'all';

type Props = {
  module: BusinessModule;
  title: string;
};

const chartColors = ['#008967', '#3b82f6', '#f59e0b', '#dc2626', '#8b5cf6'];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(mode: DateMode) {
  if (mode === 'all') return {};
  const now = new Date();
  const start = new Date(now);
  if (mode === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (mode === 'week') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (mode === 'month') {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(now.getMonth() - 11, 1);
    start.setHours(0, 0, 0, 0);
  }
  return { from: dateKey(start), to: dateKey(now) };
}

function labelFor(mode: DateMode) {
  return {
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    year: 'Last 12 Months',
    all: 'All Time',
  }[mode];
}

export function POSReportsView({ module, title }: Props) {
  const [dateMode, setDateMode] = useState<DateMode>('month');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);

  const queryRange = useMemo(() => rangeFor(dateMode), [dateMode]);
  const granularity = dateMode === 'year' ? 'month' : 'day';

  const { data: summary } = useSalesSummaryQuery({ ...queryRange, module });
  const { data: salesTrend = [] } = useSalesByPeriodQuery({
    ...queryRange,
    module,
    granularity,
  });
  const { data: paymentMethods = [] } = useSalesByPaymentMethodQuery({
    ...queryRange,
    module,
  });
  const { data: topItems = [] } = useSalesByItemQuery({
    ...queryRange,
    module,
    limit: 10,
  });
  const { data: locationBreakdown = [] } = useSalesByLocationQuery({
    ...queryRange,
    module,
  });
  const { data: cashierBreakdown = [] } = useSalesByCashierQuery({
    ...queryRange,
    module,
  });
  const { data: orderTypeBreakdown = [] } = useSalesByOrderTypeQuery({
    ...queryRange,
    module,
  });
  const { data: transactions = [] } = useSalesQuery({
    ...queryRange,
    module,
    limit: 100,
  });

  const orderTypeData = orderTypeBreakdown.map((item) => ({
    name: item.orderType.replace('_', ' '),
    value: item.orderCount,
  }));
  const visibleItems = showAllItems ? topItems : topItems.slice(0, 5);
  const visibleTransactions = showAllTransactions ? transactions : transactions.slice(0, 8);
  const chartData = salesTrend.map((point) => ({
    period: point.period,
    sales: point.netSales,
    refunds: point.refunds,
  }));
  const totalDiscounts = summary?.discounts ?? 0;
  const netSales = summary?.netSales ?? 0;
  const grossSales = summary?.grossSales ?? 0;
  const totalRefunds = summary?.totalRefunds ?? 0;
  const totalVoids = summary?.totalVoids ?? 0;
  const transactionCount = summary?.transactionCount ?? 0;

  const handleExport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Gross Sales', grossSales],
      ['Discounts', totalDiscounts],
      ['Net Sales', netSales],
      ['Transactions', transactionCount],
      ['Refunds', totalRefunds],
      ['Voids', totalVoids],
      [],
      ['Top Items'],
      ['Item', 'Quantity Sold', 'Gross Sales'],
      ...topItems.map((item) => [item.name, item.quantitySold, item.grossSales]),
      [],
      ['Sales By Location'],
      ['Location', 'Transactions', 'Gross Sales'],
      ...locationBreakdown.map((item) => [item.locationName, item.transactionCount, item.grossSales]),
      [],
      ['Sales By Cashier'],
      ['Cashier', 'Transactions', 'Gross Sales'],
      ...cashierBreakdown.map((item) => [item.cashierName, item.transactionCount, item.grossSales]),
      [],
      ['Sales By Order Type'],
      ['Order Type', 'Orders', 'Gross Sales'],
      ...orderTypeBreakdown.map((item) => [item.orderType, item.orderCount, item.grossSales]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${module.toLowerCase()}-pos-report-${dateKey(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">Sales, payment, refund, item, and transaction analytics.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month', 'year', 'all'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDateMode(mode)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                dateMode === mode
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-card text-foreground hover:border-primary'
              }`}
            >
              {labelFor(mode)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric label="Net Sales" value={formatMoney(netSales)} helper={`${transactionCount} transactions`} icon={TrendingUp} />
        <ReportMetric label="Gross Sales" value={formatMoney(grossSales)} helper={labelFor(dateMode)} icon={ReceiptText} />
        <ReportMetric label="Discounts" value={formatMoney(totalDiscounts)} helper="Applied before net sales" icon={TrendingDown} />
        <ReportMetric label="Refunds / Voids" value={`${formatMoney(totalRefunds)} / ${totalVoids}`} helper="Excluded from net sales" icon={ReceiptText} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-1 text-base font-semibold text-foreground">Revenue Trend</h2>
          <p className="mb-4 text-xs text-muted-foreground">Net sales and refunds over time</p>
          <div className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 8, right: 16, top: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={78} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" name="Net Sales" stroke="#008967" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="refunds" name="Refunds" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No revenue data for this range." />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-1 text-base font-semibold text-foreground">
            {module === 'RESTAURANT' ? 'Order Types' : 'Payment Methods'}
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">Transaction mix for the selected range</p>
          <div className="h-72">
            {(module === 'RESTAURANT' ? orderTypeData : paymentMethods).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={module === 'RESTAURANT' ? orderTypeData : paymentMethods.map((method) => ({
                      name: method.paymentMethod,
                      value: method.transactionCount,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {(module === 'RESTAURANT' ? orderTypeData : paymentMethods).map((_, index) => (
                      <Cell key={index} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No transaction mix data yet." />
            )}
          </div>
        </section>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <BreakdownTable
          title="Sales By Location"
          emptyText="No location sales for this range."
          rows={locationBreakdown.map((item) => ({
            name: item.locationName,
            count: item.transactionCount,
            value: item.grossSales,
          }))}
          countLabel="Transactions"
        />
        <BreakdownTable
          title="Sales By Cashier"
          emptyText="No cashier sales for this range."
          rows={cashierBreakdown.map((item) => ({
            name: item.cashierName,
            count: item.transactionCount,
            value: item.grossSales,
          }))}
          countLabel="Transactions"
        />
        <BreakdownTable
          title="Sales By Order Type"
          emptyText="No POS order type sales for this range."
          rows={orderTypeBreakdown.map((item) => ({
            name: item.orderType.replace('_', ' '),
            count: item.orderCount,
            value: item.grossSales,
          }))}
          countLabel="Orders"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Daily Sales Overview</h2>
          <div className="h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 8, right: 16, top: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={78} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Bar dataKey="sales" name="Sales" fill="#008967" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No daily sales yet." />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Top Items</h2>
            {topItems.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllItems((current) => !current)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary"
              >
                {showAllItems ? 'See less' : 'See more'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Rank</th>
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Sold</th>
                  <th className="pb-2 text-right font-medium">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleItems.map((item, index) => (
                  <tr key={`${item.inventoryItemId}-${item.name}`}>
                    <td className="py-3">#{index + 1}</td>
                    <td className="py-3 font-medium text-foreground">{item.name}</td>
                    <td className="py-3 text-muted-foreground">{item.quantitySold}</td>
                    <td className="py-3 text-right font-semibold text-primary">{formatMoney(item.grossSales)}</td>
                  </tr>
                ))}
                {visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={4}><EmptyState text="No item sales yet." /></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Detailed Transactions</h2>
          {transactions.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllTransactions((current) => !current)}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary"
            >
              {showAllTransactions ? 'See less' : 'See more'}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Transaction</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Payment</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleTransactions.map((sale) => (
                <tr key={sale.id}>
                  <td className="py-3 font-medium text-foreground">{sale.transactionNumber}</td>
                  <td className="py-3 text-muted-foreground">{sale.customer || 'Walk-in'}</td>
                  <td className="py-3 text-muted-foreground">{sale.paymentMethod}</td>
                  <td className="py-3 text-muted-foreground">{sale.status}</td>
                  <td className="py-3 text-right font-semibold text-foreground">{formatMoney(sale.total)}</td>
                </tr>
              ))}
              {visibleTransactions.length === 0 && (
                <tr>
                  <td colSpan={5}><EmptyState text="No transactions for this range." /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReportMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function BreakdownTable({
  title,
  emptyText,
  rows,
  countLabel,
}: {
  title: string;
  emptyText: string;
  rows: { name: string; count: number; value: number }[];
  countLabel: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">{countLabel}</th>
              <th className="pb-2 text-right font-medium">Sales</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.name}>
                <td className="py-3 font-medium text-foreground">{row.name}</td>
                <td className="py-3 text-muted-foreground">{row.count}</td>
                <td className="py-3 text-right font-semibold text-primary">{formatMoney(row.value)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3}><EmptyState text={emptyText} /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
