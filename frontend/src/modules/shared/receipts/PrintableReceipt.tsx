import { formatMoney } from '../money';
import type { ReceiptSnapshot } from './index';

type Props = {
  receipt: ReceiptSnapshot;
  issuedAt?: string;
};

export function PrintableReceipt({ receipt, issuedAt }: Props) {
  const totals = receipt.totals;

  return (
    <div className="pos-print-receipt rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground">
      <div className="mb-3 text-center">
        <p className="text-sm font-bold">Official Receipt</p>
        {receipt.receiptNumber && <p>{receipt.receiptNumber}</p>}
        {receipt.orderNumber && <p>Order {receipt.orderNumber}</p>}
        {receipt.transactionNumber && <p>{receipt.transactionNumber}</p>}
        {issuedAt && <p>{new Date(issuedAt).toLocaleString()}</p>}
      </div>

      {(receipt.customerName || receipt.paymentMethod) && (
        <div className="mb-3 border-y border-dashed border-border py-2">
          {receipt.customerName && (
            <div className="flex justify-between gap-3">
              <span>Customer</span>
              <span>{receipt.customerName}</span>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <span>Payment</span>
            <span>{receipt.paymentMethod}</span>
          </div>
        </div>
      )}

      <div className="space-y-2 border-b border-dashed border-border pb-3">
        {receipt.items.map((item, index) => (
          <div key={`${item.name}-${index}`}>
            <div className="flex justify-between gap-3">
              <span>{item.name}</span>
              <span>{formatMoney(item.totalPrice)}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {item.quantity} x {formatMoney(item.unitPrice)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-1">
        <ReceiptLine label="Subtotal" value={totals.subtotal} />
        {totals.discount > 0 && <ReceiptLine label="Discount" value={-totals.discount} />}
        {totals.tax > 0 && <ReceiptLine label="Tax" value={totals.tax} />}
        {totals.serviceCharge > 0 && <ReceiptLine label="Service" value={totals.serviceCharge} />}
        <ReceiptLine label="Total" value={totals.total} strong />
        <ReceiptLine label="Paid" value={totals.amountPaid} />
        <ReceiptLine label="Change" value={totals.change} />
      </div>
    </div>
  );
}

function ReceiptLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-border pt-2 text-sm font-bold' : ''}`}>
      <span>{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );
}
