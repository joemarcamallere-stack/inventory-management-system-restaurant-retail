import { useMemo, useState } from 'react';
import {
  Ban,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type { ApiPOSOrder, ApiReceipt, BusinessModule } from '../../../../app/api/domainTypes';
import {
  usePOSOrdersQuery,
} from '../../../lib/domainQueries';
import { formatMoney } from '../../money';

type Props = {
  module: BusinessModule;
  title: string;
  onRefundSale?: (input: { id: string; reason: string }) => Promise<unknown>;
  onVoidOrder?: (input: { id: string; reason: string }) => Promise<unknown>;
  onMarkReceiptPrinted?: (id: string) => Promise<unknown>;
  isRefunding?: boolean;
  isVoiding?: boolean;
  isMarkingPrinted?: boolean;
};

type ActionTarget =
  | { type: 'refund'; order: ApiPOSOrder }
  | { type: 'void'; order: ApiPOSOrder }
  | null;

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function receiptPayload(receipt?: ApiReceipt | null) {
  if (!receipt?.receiptData || typeof receipt.receiptData !== 'object') return null;
  return receipt.receiptData as {
    receiptNumber?: string;
    paymentNumber?: string;
    transactionNumber?: string;
    orderNumber?: string;
    customerName?: string;
    paymentMethod?: string;
    items?: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
    totals?: {
      subtotal?: number;
      discount?: number;
      tax?: number;
      serviceCharge?: number;
      total?: number;
      amountPaid?: number;
      change?: number;
    };
  };
}

export function POSOrderHistoryView({
  module,
  title,
  onRefundSale,
  onVoidOrder,
  onMarkReceiptPrinted,
  isRefunding = false,
  isVoiding = false,
  isMarkingPrinted = false,
}: Props) {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'NOT_PAID' | 'PAID' | 'REFUNDED' | 'VOIDED'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<ApiReceipt | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);
  const [reason, setReason] = useState('');
  const { data: orders = [], isLoading } = usePOSOrdersQuery({ module, limit: 250 });

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesPayment = paymentFilter === 'ALL' || order.paymentStatus === paymentFilter;
      const matchesSearch = !term || [
        order.orderNumber,
        order.customerName,
        order.tableName,
        order.sale?.transactionNumber,
        order.receipts?.map((receipt) => receipt.receiptNumber).join(' '),
      ].some((value) => value?.toLowerCase().includes(term));
      return matchesPayment && matchesSearch;
    });
  }, [orders, paymentFilter, search]);

  const confirmAction = async () => {
    if (!actionTarget || !reason.trim()) return;
    if (actionTarget.type === 'refund' && actionTarget.order.saleId && onRefundSale) {
      await onRefundSale({ id: actionTarget.order.saleId, reason: reason.trim() });
    }
    if (actionTarget.type === 'void' && onVoidOrder) {
      await onVoidOrder({ id: actionTarget.order.id, reason: reason.trim() });
    }
    setReason('');
    setActionTarget(null);
  };

  const printReceipt = async () => {
    if (!selectedReceipt) return;
    if (onMarkReceiptPrinted) {
      await onMarkReceiptPrinted(selectedReceipt.id);
    }
    window.print();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">Order history, receipt reprints, unpaid voids, and paid refunds.</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders"
              className="w-56 bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
          >
            <option value="ALL">All payments</option>
            <option value="NOT_PAID">Unpaid</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDED">Refunded</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Customer / Table</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => {
                const receipt = order.receipts?.[0] ?? null;
                const canRefund = order.paymentStatus === 'PAID' && Boolean(order.saleId) && Boolean(onRefundSale);
                const canVoid = order.paymentStatus === 'NOT_PAID' && Boolean(onVoidOrder);
                return (
                  <tr key={order.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{order.sale?.transactionNumber ?? 'No sale yet'}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{order.orderType.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{order.customerName || 'Walk-in'}</p>
                      <p className="text-xs text-muted-foreground">{order.table?.tableNumber ?? order.tableName ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill value={order.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{formatMoney(order.total)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(receipt)}
                          disabled={!receipt}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary disabled:opacity-40"
                        >
                          <ReceiptText className="h-4 w-4" />
                          Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionTarget({ type: 'refund', order })}
                          disabled={!canRefund}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary disabled:opacity-40"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionTarget({ type: 'void', order })}
                          disabled={!canVoid}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-destructive disabled:opacity-40"
                        >
                          <Ban className="h-4 w-4" />
                          Void
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No POS orders found.
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Loading orders...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          isMarkingPrinted={isMarkingPrinted}
          onClose={() => setSelectedReceipt(null)}
          onPrint={printReceipt}
        />
      )}

      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">
              {actionTarget.type === 'refund' ? 'Refund Paid Order' : 'Void Unpaid Order'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{actionTarget.order.orderNumber}</p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Required reason"
              className="mt-4 min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionTarget(null);
                  setReason('');
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={!reason.trim() || isRefunding || isVoiding}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isRefunding || isVoiding ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone = value === 'PAID'
    ? 'bg-emerald-50 text-emerald-700'
    : value === 'REFUNDED' || value === 'VOIDED'
      ? 'bg-red-50 text-red-700'
      : 'bg-amber-50 text-amber-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {value.replace('_', ' ')}
    </span>
  );
}

function ReceiptModal({
  receipt,
  isMarkingPrinted,
  onClose,
  onPrint,
}: {
  receipt: ApiReceipt;
  isMarkingPrinted: boolean;
  onClose: () => void;
  onPrint: () => void;
}) {
  const payload = receiptPayload(receipt);
  const totals = payload?.totals;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Receipt</h2>
            <p className="text-xs text-muted-foreground">{receipt.receiptNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="pos-print-receipt rounded-lg border border-border p-4 font-mono text-xs">
            <div className="mb-3 text-center">
              <p className="font-bold">{payload?.receiptNumber ?? receipt.receiptNumber}</p>
              <p>{payload?.orderNumber}</p>
              <p>{formatDate(receipt.createdAt)}</p>
            </div>
            <div className="space-y-2 border-y border-dashed border-border py-3">
              {(payload?.items ?? []).map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex justify-between gap-3">
                  <span>{item.quantity} x {item.name}</span>
                  <span>{formatMoney(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              <ReceiptTotal label="Subtotal" value={totals?.subtotal} />
              <ReceiptTotal label="Discount" value={totals?.discount} />
              <ReceiptTotal label="Tax" value={totals?.tax} />
              <ReceiptTotal label="Service" value={totals?.serviceCharge} />
              <ReceiptTotal label="Total" value={totals?.total} strong />
              <ReceiptTotal label="Paid" value={totals?.amountPaid} />
              <ReceiptTotal label="Change" value={totals?.change} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onPrint}
              disabled={isMarkingPrinted}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptTotal({ label, value, strong = false }: { label: string; value?: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span>{formatMoney(value ?? 0)}</span>
    </div>
  );
}
