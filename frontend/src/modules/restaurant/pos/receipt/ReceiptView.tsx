import { Printer, ReceiptText } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useReceiptsQuery } from '../../../lib/domainQueries';
import { formatMoney } from '../../../shared/money';
import { PrintableReceipt, type ReceiptSnapshot } from '../../../shared/receipts';

function receiptPayload(receiptData: unknown) {
  if (!receiptData || typeof receiptData !== 'object') return null;
  return receiptData as {
    orderNumber?: string;
    transactionNumber?: string;
    paymentMethod?: string;
    totals?: { total?: number; amountPaid?: number; change?: number };
  };
}

function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '-';
}

export default function ReceiptView() {
  const [searchParams] = useSearchParams();
  const selectedReceiptId = searchParams.get('receiptId');
  const selectedOrderId = searchParams.get('orderId');
  const { data: receipts = [], isLoading } = useReceiptsQuery({
    module: 'RESTAURANT',
    limit: 100,
  });
  const selectedReceipt = receipts.find((receipt) =>
    (selectedReceiptId && receipt.id === selectedReceiptId) ||
    (selectedOrderId && receipt.posOrderId === selectedOrderId),
  ) ?? receipts[0] ?? null;
  const selectedPayload = selectedReceipt ? receiptPayload(selectedReceipt.receiptData) : null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Receipt</h1>
        <p className="text-sm text-muted-foreground">Restaurant receipt history and print handoff.</p>
      </div>

      {selectedReceipt && selectedPayload && (
        <section className="mb-6 rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Receipt Preview</h2>
              <p className="text-xs text-muted-foreground">{selectedReceipt.receiptNumber}</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
          </div>
          <PrintableReceipt
            receipt={{
              ...(selectedPayload as ReceiptSnapshot),
              receiptNumber: selectedReceipt.receiptNumber,
              paymentMethod: selectedPayload.paymentMethod ?? selectedReceipt.payment?.method ?? 'Cash',
              items: (selectedPayload as ReceiptSnapshot).items ?? [],
              totals: {
                subtotal: (selectedPayload as ReceiptSnapshot).totals?.subtotal ?? 0,
                discount: (selectedPayload as ReceiptSnapshot).totals?.discount ?? 0,
                tax: (selectedPayload as ReceiptSnapshot).totals?.tax ?? 0,
                serviceCharge: (selectedPayload as ReceiptSnapshot).totals?.serviceCharge ?? 0,
                total: (selectedPayload as ReceiptSnapshot).totals?.total ?? 0,
                amountPaid: (selectedPayload as ReceiptSnapshot).totals?.amountPaid ?? selectedReceipt.payment?.amountPaid ?? 0,
                change: (selectedPayload as ReceiptSnapshot).totals?.change ?? 0,
              },
            }}
            issuedAt={selectedReceipt.createdAt}
          />
        </section>
      )}

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Recent Receipts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Receipt</th>
                <th className="pb-2 font-medium">Order / Sale</th>
                <th className="pb-2 font-medium">Payment</th>
                <th className="pb-2 font-medium">Created</th>
                <th className="pb-2 text-right font-medium">Total</th>
                <th className="pb-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {receipts.map((receipt) => {
                const payload = receiptPayload(receipt.receiptData);
                return (
                  <tr key={receipt.id}>
                    <td className="py-3 font-medium text-foreground">{receipt.receiptNumber}</td>
                    <td className="py-3 text-muted-foreground">
                      {payload?.orderNumber ?? receipt.posOrder?.orderNumber ?? payload?.transactionNumber ?? receipt.sale?.transactionNumber ?? '-'}
                    </td>
                    <td className="py-3 text-muted-foreground">{payload?.paymentMethod ?? receipt.payment?.method ?? '-'}</td>
                    <td className="py-3 text-muted-foreground">{formatDate(receipt.createdAt)}</td>
                    <td className="py-3 text-right font-semibold text-foreground">{formatMoney(payload?.totals?.total ?? receipt.payment?.amountPaid ?? 0)}</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </button>
                    </td>
                  </tr>
                );
              })}
              {isLoading && (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Loading receipts...</td></tr>
              )}
              {!isLoading && receipts.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No receipts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
