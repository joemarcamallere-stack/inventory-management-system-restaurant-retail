import { POSOrderHistoryView as SharedPOSOrderHistoryView } from '../../../shared/pos/history';
import {
  useMarkRestaurantReceiptPrintedMutation,
  useRefundRestaurantSaleMutation,
  useVoidRestaurantPOSOrderMutation,
} from '../../../lib/restaurant';

export default function POSOrderHistoryView() {
  const refundSale = useRefundRestaurantSaleMutation();
  const voidOrder = useVoidRestaurantPOSOrderMutation();
  const markReceiptPrinted = useMarkRestaurantReceiptPrintedMutation();

  return (
    <SharedPOSOrderHistoryView
      module="RESTAURANT"
      title="Restaurant POS History"
      onRefundSale={refundSale.mutateAsync}
      onVoidOrder={voidOrder.mutateAsync}
      onMarkReceiptPrinted={markReceiptPrinted.mutateAsync}
      isRefunding={refundSale.isPending}
      isVoiding={voidOrder.isPending}
      isMarkingPrinted={markReceiptPrinted.isPending}
    />
  );
}
