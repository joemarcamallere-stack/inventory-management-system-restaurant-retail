import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CreditCard, ReceiptText } from 'lucide-react';
import { useCompleteRestaurantPOSOrderPaymentMutation } from '../../../lib/restaurant';
import { usePaymentsQuery, usePOSOrdersQuery, usePOSSettingsQuery } from '../../../lib/domainQueries';
import { formatMoney } from '../../../shared/money';
import { getPOSPayments } from '../../../shared/pos/settings';
import { createReceiptSnapshot } from '../../../shared/receipts';

function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '-';
}

export default function PaymentView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrderId, setSelectedOrderId] = useState(searchParams.get('orderId') ?? '');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const { data: unpaidOrders = [], isLoading: ordersLoading } = usePOSOrdersQuery({
    module: 'RESTAURANT',
    paymentStatus: 'NOT_PAID',
    limit: 100,
  });
  const { data: payments = [], isLoading: paymentsLoading } = usePaymentsQuery({
    module: 'RESTAURANT',
    limit: 100,
  });
  const { data: posSettings = [] } = usePOSSettingsQuery({ module: 'RESTAURANT' });
  const completePayment = useCompleteRestaurantPOSOrderPaymentMutation();

  const paymentSettings = useMemo(() => getPOSPayments(posSettings), [posSettings]);
  const availablePaymentMethods = paymentSettings.methods.length > 0 ? paymentSettings.methods : ['Cash'];
  const selectedOrder = unpaidOrders.find((order) => order.id === selectedOrderId) ?? unpaidOrders[0] ?? null;
  const cashChange = selectedOrder ? amountPaid - selectedOrder.total : 0;

  useEffect(() => {
    if (!selectedOrderId && unpaidOrders[0]) {
      setSelectedOrderId(unpaidOrders[0].id);
    }
  }, [selectedOrderId, unpaidOrders]);

  useEffect(() => {
    if (!availablePaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0] ?? 'Cash');
    }
  }, [availablePaymentMethods, paymentMethod]);

  useEffect(() => {
    if (!selectedOrder) return;
    setAmountPaid(paymentMethod === 'Cash' ? Math.ceil(selectedOrder.total / 100) * 100 : selectedOrder.total);
  }, [paymentMethod, selectedOrder]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const next = new URLSearchParams(searchParams);
    next.set('view', 'restaurant-payment');
    next.set('orderId', orderId);
    setSearchParams(next);
  };

  const handleCompletePayment = async () => {
    if (!selectedOrder) return;
    if (paymentMethod === 'Cash' && amountPaid < selectedOrder.total) {
      alert('Insufficient payment amount');
      return;
    }

    try {
      const paidOrder = await completePayment.mutateAsync({
        id: selectedOrder.id,
        paymentMethod,
        amountPaid: paymentMethod === 'Cash' ? amountPaid : selectedOrder.total,
        receiptData: createReceiptSnapshot({
          orderNumber: selectedOrder.orderNumber,
          customerName: selectedOrder.customerName ?? undefined,
          paymentMethod,
          items: selectedOrder.items,
          totals: {
            subtotal: selectedOrder.subtotal,
            discount: selectedOrder.discount,
            tax: selectedOrder.tax,
            serviceCharge: selectedOrder.serviceCharge,
            total: selectedOrder.total,
            amountPaid: paymentMethod === 'Cash' ? amountPaid : selectedOrder.total,
            change: paymentMethod === 'Cash' ? amountPaid - selectedOrder.total : 0,
          },
        }),
      });
      const next = new URLSearchParams(searchParams);
      next.set('view', 'restaurant-receipt');
      next.set('orderId', paidOrder.id);
      const receiptId = paidOrder.receipts?.[0]?.id;
      if (receiptId) next.set('receiptId', receiptId);
      setSearchParams(next);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to complete payment');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Payment</h1>
        <p className="text-sm text-muted-foreground">Open restaurant orders waiting for payment and recent paid transactions.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Unpaid Orders</h2>
          </div>
          <div className="space-y-3">
            {ordersLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading unpaid orders...</p>}
            {!ordersLoading && unpaidOrders.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No unpaid restaurant orders.</p>
            )}
            {unpaidOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => handleSelectOrder(order.id)}
                className={`w-full rounded-lg border p-4 text-left ${selectedOrder?.id === order.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.orderType.replace('_', ' ')} | {order.table?.tableNumber ?? order.tableName ?? 'No table'}
                    </p>
                  </div>
                  <p className="font-bold text-primary">{formatMoney(order.total)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Recent Payments</h2>
          </div>
          {selectedOrder && (
            <div className="mb-6 rounded-lg border border-border bg-background p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{selectedOrder.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.items.length} items</p>
                </div>
                <p className="text-xl font-bold text-primary">{formatMoney(selectedOrder.total)}</p>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {availablePaymentMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${paymentMethod === method ? 'border-primary bg-primary text-white' : 'border-border text-foreground hover:border-primary'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              {paymentMethod === 'Cash' && (
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Cash Received</label>
                  <input
                    type="number"
                    min={selectedOrder.total}
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(Number(event.target.value))}
                    className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  {amountPaid >= selectedOrder.total && (
                    <p className="mt-2 text-sm font-semibold text-primary">Change: {formatMoney(cashChange)}</p>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={handleCompletePayment}
                disabled={completePayment.isPending || (paymentMethod === 'Cash' && amountPaid < selectedOrder.total)}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {completePayment.isPending ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Payment</th>
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Paid At</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-3 font-medium text-foreground">{payment.paymentNumber}</td>
                    <td className="py-3 text-muted-foreground">{payment.posOrder?.orderNumber ?? payment.sale?.transactionNumber ?? '-'}</td>
                    <td className="py-3 text-muted-foreground">{payment.method}</td>
                    <td className="py-3 text-muted-foreground">{formatDate(payment.paidAt)}</td>
                    <td className="py-3 text-right font-semibold text-foreground">{formatMoney(payment.amountPaid)}</td>
                  </tr>
                ))}
                {paymentsLoading && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading payments...</td></tr>
                )}
                {!paymentsLoading && payments.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No payments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
