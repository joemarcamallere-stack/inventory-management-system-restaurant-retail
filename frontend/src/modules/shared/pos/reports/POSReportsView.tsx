import { useMemo, useRef, useState, type ReactNode } from 'react';
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
  Calendar,
  Download,
  Printer,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { BusinessModule } from '../../../../app/api/domainTypes';
import {
  useSalesByItemQuery,
  useSalesByOrderTypeQuery,
  useSalesByPeriodQuery,
  useSalesQuery,
  useSalesSummaryQuery,
} from '../../../lib/domainQueries';
import { formatMoney } from '../../money';

type DateMode = 'all' | 'today' | 'date' | 'week' | 'month' | 'year';

type Props = {
  module: BusinessModule;
  title: string;
};

const chartColors = ['#008967', '#3b82f6', '#f59e0b', '#ef4444'];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFor(mode: DateMode, selectedDate: string) {
  if (mode === 'all') return {};
  if (mode === 'date') {
    const date = selectedDate || dateKey(new Date());
    return { from: date, to: date };
  }

  const now = new Date();
  const start = new Date(now);
  if (mode === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (mode === 'week') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (mode === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return { from: dateKey(start), to: dateKey(now) };
}

function labelFor(mode: DateMode) {
  return {
    all: 'All',
    today: 'Today',
    date: 'Select Date',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  }[mode];
}

function displayDate(date: string) {
  return date ? new Date(date).toLocaleDateString() : '';
}

function orderTypeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function POSReportsView({ module, title }: Props) {
  const [dateMode, setDateMode] = useState<DateMode>('today');
  const [selectedDate, setSelectedDate] = useState('');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const queryRange = useMemo(() => rangeFor(dateMode, selectedDate), [dateMode, selectedDate]);
  const reportDateLabel = dateMode === 'date' ? displayDate(selectedDate) || 'Select Date' : labelFor(dateMode);
  const granularity = dateMode === 'year' ? 'month' : 'day';

  const { data: summary } = useSalesSummaryQuery({ ...queryRange, module });
  const { data: salesTrend = [] } = useSalesByPeriodQuery({ ...queryRange, module, granularity });
  const { data: topItems = [] } = useSalesByItemQuery({ ...queryRange, module, limit: 10 });
  const { data: orderTypeBreakdown = [] } = useSalesByOrderTypeQuery({ ...queryRange, module });
  const { data: transactions = [] } = useSalesQuery({ ...queryRange, module, limit: 100 });

  const visibleItems = showAllItems ? topItems : topItems.slice(0, 5);
  const visibleTransactions = showAllTransactions ? transactions : transactions.slice(0, 5);
  const chartData = salesTrend.map((point) => ({
    period: point.period,
    sales: point.netSales,
    orders: point.grossSales > 0 ? 1 : 0,
  }));
  const totalDiscounts = summary?.discounts ?? 0;
  const netSales = summary?.netSales ?? 0;
  const grossSales = summary?.grossSales ?? 0;
  const serviceFees = summary?.tax ?? 0;
  const vatCollected = summary?.tax ?? 0;
  const totalRefunds = summary?.totalRefunds ?? 0;
  const transactionCount = summary?.transactionCount ?? 0;
  const orderTypeData = orderTypeBreakdown.length > 0
    ? orderTypeBreakdown.map((item) => ({
        id: item.orderType,
        name: orderTypeLabel(item.orderType),
        value: item.orderCount,
        revenue: item.grossSales,
      }))
    : [
        { id: 'DINE_IN', name: 'Dine-In', value: 0, revenue: 0 },
        { id: 'TAKEOUT', name: 'Takeout', value: 0, revenue: 0 },
      ];
  const dineInRevenue = orderTypeData.find((item) => /dine/i.test(item.id) || /dine/i.test(item.name))?.revenue ?? 0;
  const takeoutRevenue = orderTypeData.find((item) => /take/i.test(item.id) || /take/i.test(item.name))?.revenue ?? 0;
  const discountDistribution = totalDiscounts > 0
    ? [{ id: 'discounts', name: 'Discounts', value: totalDiscounts }]
    : [];

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') input.showPicker();
    else input.click();
  };

  const handleExport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Gross Sales', grossSales],
      ['Discounts', totalDiscounts],
      ['Net Sales', netSales],
      ['Transactions', transactionCount],
      ['Refunds', totalRefunds],
      [],
      ['Top Items'],
      ['Item', 'Quantity Sold', 'Gross Sales'],
      ...topItems.map((item) => [item.name, item.quantitySold, item.grossSales]),
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
    <div className="min-h-full bg-background p-4 font-[var(--font-body)] sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-primary">{title}</h1>
          <p className="text-sm text-muted-foreground">Detailed insights and revenue analytics</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative inline-flex items-stretch">
            <button
              type="button"
              onClick={openDatePicker}
              className="mr-2 inline-flex items-center justify-center rounded-lg border border-border bg-white px-3 text-primary transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Choose date"
              title={selectedDate || 'Choose date'}
            >
              <Calendar className="h-4 w-4" />
            </button>
            <select
              value={dateMode}
              onChange={(event) => {
                const nextMode = event.target.value as DateMode;
                if (nextMode === 'date') {
                  openDatePicker();
                  return;
                }
                setDateMode(nextMode);
              }}
              className="rounded-lg border border-border bg-input-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {dateMode === 'date' && selectedDate && <option value="date">{displayDate(selectedDate)}</option>}
              {(['all', 'today', 'week', 'month', 'year'] as const).map((mode) => (
                <option key={mode} value={mode}>{labelFor(mode)}</option>
              ))}
            </select>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setDateMode('date');
              }}
              className="pointer-events-none absolute left-0 top-full h-px w-px opacity-0"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
          {transactions.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ReportMetric label={`Sales for ${reportDateLabel}`} value={formatMoney(netSales)} helper={`${transactionCount} orders`} icon={<PesoIcon className="h-5 w-5 text-green-600" />} helperIcon={<TrendingUp className="mr-1 h-3 w-3" />} tone="green" />
        <ReportMetric label="Service Fees" value={formatMoney(serviceFees)} helper="1% of subtotals" icon={<PesoIcon className="h-5 w-5 text-blue-600" />} helperIcon={<TrendingUp className="mr-1 h-3 w-3" />} tone="blue" />
        <ReportMetric label="VAT Collected" value={formatMoney(vatCollected)} helper="12% VAT" icon={<PesoIcon className="h-5 w-5 text-orange-600" />} helperIcon={<Calendar className="mr-1 h-3 w-3" />} tone="orange" />
        <ReportMetric label="Discounts Given" value={formatMoney(totalDiscounts)} helper={`${totalDiscounts > 0 ? 1 : 0} discounts`} icon={<ShoppingCart className="h-5 w-5 text-purple-600" />} helperIcon={<TrendingDown className="mr-1 h-3 w-3" />} tone="purple" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-primary">Revenue Trend</h3>
            <span className="text-sm text-muted-foreground">{reportDateLabel}</span>
          </div>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" name="Revenue (PHP)" stroke="#008967" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No revenue data for this range." />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-primary">Payment Summary</h3>
          <div className="space-y-4">
            <PaymentRow label="Gross Sales" value={formatMoney(grossSales || netSales + totalDiscounts)} />
            <PaymentRow label="Service Fees (1%)" value={formatMoney(serviceFees)} valueClass="text-blue-600" />
            <PaymentRow label="Discounts Given" value={`- ${formatMoney(totalDiscounts)}`} valueClass="text-red-600" />
            <PaymentRow label="VAT Collected (12%)" value={formatMoney(vatCollected)} />
            <div className="flex items-center justify-between pt-2">
              <span className="font-medium">Net Revenue</span>
              <span className="text-lg font-bold text-primary">{formatMoney(netSales)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-primary">Daily Sales Overview</h3>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" orientation="left" stroke="#008967" />
                  <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                  <Tooltip formatter={(value, name) => name === 'Sales (PHP)' ? formatMoney(Number(value)) : value} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="sales" name="Sales (PHP)" fill="#008967" />
                  <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No daily sales yet." />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-primary">Dine-In vs Takeout Sales</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderTypeData.map((entry, index) => (
                    <Cell key={entry.id} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dine-In Revenue:</span>
              <span className="font-medium">{formatMoney(dineInRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Takeout Revenue:</span>
              <span className="font-medium">{formatMoney(takeoutRevenue)}</span>
            </div>
          </div>
        </section>
      </div>

      {discountDistribution.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-primary">Discount Distribution</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={discountDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {discountDistribution.map((entry, index) => <Cell key={entry.id} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-primary">Refund Reports</h3>
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">{totalRefunds > 0 ? `${formatMoney(totalRefunds)} refunded` : 'No refunds processed'}</p>
              <p className="mt-1 text-xs text-muted-foreground">All transactions completed successfully</p>
            </div>
          </section>
        </div>
      )}

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium text-primary">Product Sales Breakdown</h3>
          <button type="button" onClick={() => setShowAllItems((current) => !current)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-muted">
            {showAllItems ? 'See less' : 'See more'}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0f172a]">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-emerald-400">Rank</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-emerald-400">Product Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-emerald-400">Units Sold</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-emerald-400">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {visibleItems.map((item, index) => (
                <tr key={`${item.inventoryItemId}-${item.name}`} className="transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-medium ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-muted text-foreground'
                    }`}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{item.quantitySold} units</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="h-2 max-w-xs flex-1 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${topItems[0]?.quantitySold ? (item.quantitySold / topItems[0].quantitySold) * 100 : 0}%` }} />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {topItems[0]?.quantitySold ? ((item.quantitySold / topItems[0].quantitySold) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </td>
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

      <section className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium text-primary">Detailed Transaction Reports</h3>
          <button type="button" onClick={() => setShowAllTransactions((current) => !current)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-muted">
            {showAllTransactions ? 'See less' : 'See more'}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0f172a]">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-emerald-400">Order ID</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-emerald-400">Customer</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-emerald-400">Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-emerald-400">Date</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-emerald-400">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {visibleTransactions.map((sale) => (
                <tr key={sale.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{sale.transactionNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{sale.customer || 'Walk-in'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">POS</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{dateKey(new Date(sale.createdAt))}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{formatMoney(sale.total)}</td>
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

function PesoIcon({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontWeight: 700,
        fontSize: '1.25em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        lineHeight: 1,
      }}
    >
      {'\u20b1'}
    </span>
  );
}

function ReportMetric({
  icon,
  label,
  value,
  helper,
  helperIcon,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  helperIcon: ReactNode;
  tone: 'green' | 'blue' | 'orange' | 'purple';
}) {
  const toneClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  const helperClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
  };
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClasses[tone]}`}>
          {icon}
        </div>
      </div>
      <h2 className="mb-1 text-2xl font-bold text-primary">{value}</h2>
      <div className={`flex items-center text-xs ${helperClasses[tone]}`}>
        {helperIcon}
        <span>{helper}</span>
      </div>
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

function PaymentRow({ label, value, valueClass = 'text-foreground' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}
