import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Calendar,
  CreditCard,
  Eye,
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

const ORDERS_PER_PAGE = 10;

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
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DINE_IN' | 'TAKEOUT' | 'MIXED' | 'RETAIL'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'NOT_PAID' | 'PAID' | 'REFUNDED' | 'VOIDED'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<ApiReceipt | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ApiPOSOrder | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);
  const [reason, setReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { data: orders = [], isLoading } = usePOSOrdersQuery({ module, limit: 250 });

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesType = typeFilter === 'ALL' || order.orderType === typeFilter;
      const matchesPayment = paymentFilter === 'ALL' || order.paymentStatus === paymentFilter;
      const matchesSearch = !term || [
        order.orderNumber,
        order.customerName,
        order.tableName,
        order.sale?.transactionNumber,
        order.receipts?.map((receipt) => receipt.receiptNumber).join(' '),
      ].some((value) => value?.toLowerCase().includes(term));
      return matchesType && matchesPayment && matchesSearch;
    });
  }, [orders, paymentFilter, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * ORDERS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(pageStartIndex, pageStartIndex + ORDERS_PER_PAGE);
  const visibleStart = filteredOrders.length === 0 ? 0 : pageStartIndex + 1;
  const visibleEnd = Math.min(pageStartIndex + ORDERS_PER_PAGE, filteredOrders.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [paymentFilter, search, typeFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
    <div className="min-h-full bg-[#f8fafb] p-8 font-['Inter',sans-serif]">
      <div className="mb-6">
        <div>
          <h1 className="text-[30px] font-bold leading-tight text-[#008967]">{title}</h1>
          <p className="mt-2 text-[15px] text-[#9a9fc0]">
            {module === 'RESTAURANT' ? 'Manage and track all restaurant orders' : 'Manage and track all retail transactions'}
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-[14px] border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 flex-1 items-center gap-3 rounded-[10px] border border-[#e2e8f0] bg-[#f1f5f9] px-3">
            <Search className="h-4 w-4 text-[#9a9fc0]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by Order ID or Customer..."
              className="w-full bg-transparent text-[15px] text-[#111827] outline-none placeholder:text-[#9a9fc0]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            className="h-11 rounded-[10px] border border-[#e2e8f0] bg-[#f1f5f9] px-3 text-[15px] text-[#111827] outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="DINE_IN">Dine-in</option>
            <option value="TAKEOUT">Takeout</option>
            <option value="MIXED">Mixed</option>
            {module === 'RETAIL' && <option value="RETAIL">Retail</option>}
          </select>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}
            className="h-11 rounded-[10px] border border-[#e2e8f0] bg-[#f1f5f9] px-3 text-[15px] text-[#111827] outline-none"
          >
            <option value="ALL">All Payments</option>
            <option value="PAID">Paid</option>
            <option value="NOT_PAID">Not Paid</option>
            <option value="VOIDED">Void</option>
          </select>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#e2e8f0] bg-white text-[#008967]">
            <Calendar className="size-4" />
          </button>
          <select className="h-11 rounded-[10px] border border-[#e2e8f0] bg-[#f1f5f9] px-4 text-[15px] text-[#111827] outline-none">
            <option>All</option>
          </select>
          <span className="whitespace-nowrap text-[13px] text-[#9a9fc0]">{filteredOrders.length} orders</span>
        </div>
      </div>

      <section className="overflow-hidden rounded-[14px] border border-[#e2e8f0] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e2e8f0] bg-white text-[13px] text-[#9a9fc0]">
              <tr>
                <th className="px-5 py-4 font-semibold">Order Number</th>
                <th className="px-5 py-4 font-semibold">Customer</th>
                <th className="px-5 py-4 font-semibold">Type</th>
                <th className="px-5 py-4 font-semibold">Table</th>
                <th className="px-5 py-4 font-semibold">Party</th>
                <th className="px-5 py-4 font-semibold">Queue</th>
                <th className="px-5 py-4 font-semibold">Total</th>
                <th className="px-5 py-4 font-semibold">Payments</th>
                <th className="px-5 py-4 font-semibold">Date and Time</th>
                <th className="px-5 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2f7]">
              {paginatedOrders.map((order) => {
                const receipt = order.receipts?.[0] ?? null;
                const canRefund = order.paymentStatus === 'PAID' && Boolean(order.saleId) && Boolean(onRefundSale);
                const canVoid = order.paymentStatus === 'NOT_PAID' && Boolean(onVoidOrder);
                return (
                  <tr key={order.id}>
                    <td className="px-5 py-4 font-medium text-[#111827]">{order.orderNumber}</td>
                    <td className="px-5 py-4 text-[#111827]">{order.customerName || 'Walk-in'}</td>
                    <td className="px-5 py-4 text-[#111827]">{order.orderType.replace('_', ' ')}</td>
                    <td className="px-5 py-4 text-[#111827]">{order.table?.tableNumber ?? order.tableName ?? '-'}</td>
                    <td className="px-5 py-4 text-[#111827]">{order.partySize ?? '-'}</td>
                    <td className="px-5 py-4 text-[#111827]">-</td>
                    <td className="px-5 py-4 font-semibold text-[#111827]">{formatMoney(order.total)}</td>
                    <td className="px-5 py-4">
                      <StatusPill value={order.paymentStatus} />
                    </td>
                    <td className="px-5 py-4 text-[#111827]">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-medium text-[#008967] hover:bg-[#008967]/10"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(receipt)}
                          disabled={!receipt}
                          className="inline-flex items-center gap-1 rounded-[8px] border border-[#e2e8f0] px-3 py-2 text-xs font-medium text-[#111827] hover:border-[#008967] disabled:opacity-40"
                        >
                          <ReceiptText className="h-4 w-4" />
                          Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionTarget({ type: 'refund', order })}
                          disabled={!canRefund}
                          className="inline-flex items-center gap-1 rounded-[8px] border border-[#e2e8f0] px-3 py-2 text-xs font-medium text-[#111827] hover:border-[#008967] disabled:opacity-40"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionTarget({ type: 'void', order })}
                          disabled={!canVoid}
                          className="inline-flex items-center gap-1 rounded-[8px] border border-[#e2e8f0] px-3 py-2 text-xs font-medium text-[#111827] hover:border-red-600 disabled:opacity-40"
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
                  <td colSpan={10} className="px-4 py-16 text-center text-[15px] text-[#9a9fc0]">
                    No orders found matching your filters.
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[15px] text-[#9a9fc0]">
                    Loading orders...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <div className="mt-4 flex items-center justify-between text-[15px] text-[#9a9fc0]">
        <span>Showing {visibleStart} to {visibleEnd} of {filteredOrders.length} orders</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-[8px] border border-[#e2e8f0] bg-white px-4 py-2 text-[#9a9fc0] disabled:opacity-70">Previous</button>
          <span className="rounded-[8px] border border-[#bdebdc] bg-[#e9fff7] px-4 py-2 font-medium text-[#008967]">Page {currentPage} of {totalPages}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded-[8px] border border-[#e2e8f0] bg-white px-4 py-2 text-[#9a9fc0] disabled:opacity-70">Next</button>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onReceipt={(receipt) => {
            setSelectedOrder(null);
            setSelectedReceipt(receipt);
          }}
          onRefund={(order) => {
            setSelectedOrder(null);
            setActionTarget({ type: 'refund', order });
          }}
          onVoid={(order) => {
            setSelectedOrder(null);
            setActionTarget({ type: 'void', order });
          }}
          canRefund={selectedOrder.paymentStatus === 'PAID' && Boolean(selectedOrder.saleId) && Boolean(onRefundSale)}
          canVoid={selectedOrder.paymentStatus === 'NOT_PAID' && Boolean(onVoidOrder)}
        />
      )}

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
  const label = value === 'NOT_PAID'
    ? 'Not Paid'
    : value === 'VOIDED'
      ? 'Void'
      : value.replace('_', ' ');
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function OrderDetailsModal({
  order,
  onClose,
  onReceipt,
  onRefund,
  onVoid,
  canRefund,
  canVoid,
}: {
  order: ApiPOSOrder;
  onClose: () => void;
  onReceipt: (receipt: ApiReceipt) => void;
  onRefund: (order: ApiPOSOrder) => void;
  onVoid: (order: ApiPOSOrder) => void;
  canRefund: boolean;
  canVoid: boolean;
}) {
  const receipt = order.receipts?.[0] ?? null;
  const dineInItems = order.items.filter((item) => item.itemType === 'dine-in' || item.itemType === 'DINE_IN');
  const takeoutItems = order.items.filter((item) => item.itemType === 'takeout' || item.itemType === 'TAKEOUT');
  const uncategorizedItems = order.items.filter((item) => !dineInItems.includes(item) && !takeoutItems.includes(item));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">Order Details</h2>
            <p className="text-xs text-[#9a9fc0]">{order.orderNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="mb-5 grid gap-3 rounded-xl bg-[#f1f5f9] p-4 text-sm md:grid-cols-2">
            <DetailLine label="Customer" value={order.customerName || 'Walk-in'} />
            <DetailLine label="Type" value={order.orderType.replace('_', ' ')} />
            <DetailLine label="Payment" value={order.paymentStatus.replace('_', ' ')} />
            <DetailLine label="Status" value={order.status.replace('_', ' ')} />
            <DetailLine label="Table" value={order.table?.tableNumber ?? order.tableName ?? '-'} />
            <DetailLine label="Party" value={order.partySize ? String(order.partySize) : '-'} />
            <DetailLine label="Date" value={formatDate(order.createdAt)} />
            <DetailLine label="Cashier" value={order.createdBy?.name ?? '-'} />
          </div>

          <div className="space-y-5">
            <OrderItemSection title="Dine-in Items" items={dineInItems} />
            <OrderItemSection title="Takeout Items" items={takeoutItems} />
            <OrderItemSection title="Items" items={uncategorizedItems} />
          </div>

          {order.notes && (
            <div className="mt-5 rounded-xl border border-[#e2e8f0] p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9a9fc0]">Notes</p>
              <p className="text-sm text-[#111827]">{order.notes}</p>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-[#e2e8f0] p-4">
            <ReceiptTotal label="Subtotal" value={order.subtotal} />
            <ReceiptTotal label="Service Fee" value={order.serviceCharge} />
            <ReceiptTotal label="Tax" value={order.tax} />
            <ReceiptTotal label={`Discount${order.discountType ? ` (${order.discountType})` : ''}`} value={order.discount} />
            <ReceiptTotal label="Total Amount Due" value={order.total} strong />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[#e2e8f0] px-6 py-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#e2e8f0] py-3 text-sm font-medium text-[#64748b] hover:bg-[#f8fafb]">
            Close
          </button>
          {order.paymentStatus === 'NOT_PAID' && (
            <button type="button" disabled className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#008967] py-3 text-sm font-semibold text-white opacity-40">
              <CreditCard className="h-4 w-4" />
              Payment
            </button>
          )}
          {receipt && (
            <button type="button" onClick={() => onReceipt(receipt)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#008967] py-3 text-sm font-semibold text-white hover:bg-[#007a5e]">
              <Printer className="h-4 w-4" />
              Receipt
            </button>
          )}
          {canRefund && (
            <button type="button" onClick={() => onRefund(order)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-100 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
              <RotateCcw className="h-4 w-4" />
              Refund
            </button>
          )}
          {canVoid && (
            <button type="button" onClick={() => onVoid(order)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-purple-100 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50">
              <Ban className="h-4 w-4" />
              Void
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[#64748b]">{label}</span>
      <span className="text-right font-medium text-[#111827]">{value}</span>
    </div>
  );
}

function OrderItemSection({ title, items }: { title: string; items: ApiPOSOrder['items'] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[#008967]">{title}</h3>
      <div className="space-y-2 rounded-xl border border-[#e2e8f0] p-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-3 text-sm">
            <div>
              <p className="font-medium text-[#111827]">{item.quantity}x {item.name}</p>
              {item.notes && <p className="text-xs text-[#9a9fc0]">{item.notes}</p>}
            </div>
            <span className="font-medium text-[#111827]">{formatMoney(item.totalPrice)}</span>
          </div>
        ))}
      </div>
    </section>
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
