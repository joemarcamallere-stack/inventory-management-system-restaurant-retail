import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Printer, ReceiptText } from 'lucide-react';
import { useReceiptsQuery } from '../../../lib/domainQueries';
import { formatMoney } from '../../../shared/money';
import { type ReceiptSnapshot } from '../../../shared/receipts';
import { RetailThermalReceipt } from './RetailThermalReceipt';

function receiptPayload(receiptData: unknown) {
  if (!receiptData || typeof receiptData !== 'object') return null;
  return receiptData as Partial<ReceiptSnapshot>;
}

function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '-';
}

export default function RetailReceiptView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedReceiptId = searchParams.get('receiptId');
  const selectedOrderId = searchParams.get('orderId');
  const { data: receipts = [], isLoading } = useReceiptsQuery({
    module: 'RETAIL',
    limit: 100,
  });

  const selectedReceipt = useMemo(
    () =>
      receipts.find((receipt) =>
        (selectedReceiptId && receipt.id === selectedReceiptId) ||
        (selectedOrderId && receipt.posOrderId === selectedOrderId),
      ) ?? receipts[0] ?? null,
    [receipts, selectedOrderId, selectedReceiptId],
  );
  const selectedPayload = selectedReceipt ? receiptPayload(selectedReceipt.receiptData) : null;
  const selectedSnapshot = selectedReceipt && selectedPayload
    ? {
        receiptNumber: selectedReceipt.receiptNumber,
        paymentNumber: selectedReceipt.payment?.paymentNumber,
        transactionNumber: selectedPayload.transactionNumber ?? selectedReceipt.sale?.transactionNumber,
        orderNumber: selectedPayload.orderNumber ?? selectedReceipt.posOrder?.orderNumber,
        customerName: selectedPayload.customerName,
        paymentMethod: selectedPayload.paymentMethod ?? selectedReceipt.payment?.method ?? 'Cash',
        items: selectedPayload.items ?? [],
        totals: {
          subtotal: selectedPayload.totals?.subtotal ?? 0,
          discount: selectedPayload.totals?.discount ?? 0,
          tax: selectedPayload.totals?.tax ?? 0,
          serviceCharge: selectedPayload.totals?.serviceCharge ?? 0,
          total: selectedPayload.totals?.total ?? selectedReceipt.payment?.amountPaid ?? 0,
          amountPaid: selectedPayload.totals?.amountPaid ?? selectedReceipt.payment?.amountPaid ?? 0,
          change: selectedPayload.totals?.change ?? 0,
        },
      }
    : null;

  const selectReceipt = (receiptId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', 'retail-thermal-receipt');
    next.set('receiptId', receiptId);
    next.delete('orderId');
    setSearchParams(next);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Retail Thermal Receipt</h1>
        <p className="text-sm text-muted-foreground">Review, reprint, and hand off retail POS receipts.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Receipts</h2>
          </div>
          <div className="max-h-[620px] space-y-2 overflow-y-auto">
            {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading receipts...</p>}
            {!isLoading && receipts.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No retail receipts yet.</p>
            )}
            {receipts.map((receipt) => {
              const payload = receiptPayload(receipt.receiptData);
              const total = payload?.totals?.total ?? receipt.payment?.amountPaid ?? 0;
              return (
                <button
                  key={receipt.id}
                  type="button"
                  onClick={() => selectReceipt(receipt.id)}
                  className={`w-full rounded-lg border p-4 text-left ${selectedReceipt?.id === receipt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{receipt.receiptNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {payload?.orderNumber ?? receipt.posOrder?.orderNumber ?? receipt.sale?.transactionNumber ?? '-'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(receipt.createdAt)}</p>
                    </div>
                    <p className="font-bold text-primary">{formatMoney(total)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Receipt Preview</h2>
              <p className="text-xs text-muted-foreground">{selectedReceipt?.receiptNumber ?? 'Select a receipt'}</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!selectedSnapshot}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>

          {selectedSnapshot ? (
            <RetailThermalReceipt receipt={selectedSnapshot} issuedAt={selectedReceipt?.createdAt} />
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Select a receipt to preview.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
