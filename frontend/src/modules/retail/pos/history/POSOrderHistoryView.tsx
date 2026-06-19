import { POSOrderHistoryView as SharedPOSOrderHistoryView } from '../../../shared/pos/history';
import {
  useMarkRetailReceiptPrintedMutation,
  useRefundRetailSaleMutation,
  useVoidRetailPOSOrderMutation,
} from '../../../lib/retail';

export default function POSOrderHistoryView() {
  const refundSale = useRefundRetailSaleMutation();
  const voidOrder = useVoidRetailPOSOrderMutation();
  const markReceiptPrinted = useMarkRetailReceiptPrintedMutation();

  return (
    <SharedPOSOrderHistoryView
      module="RETAIL"
      title="Retail POS History"
      onRefundSale={refundSale.mutateAsync}
      onVoidOrder={voidOrder.mutateAsync}
      onMarkReceiptPrinted={markReceiptPrinted.mutateAsync}
      isRefunding={refundSale.isPending}
      isVoiding={voidOrder.isPending}
      isMarkingPrinted={markReceiptPrinted.isPending}
    />
  );
}
