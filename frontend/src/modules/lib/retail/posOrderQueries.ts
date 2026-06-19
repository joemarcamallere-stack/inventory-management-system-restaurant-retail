import {
  completePOSOrderPayment,
  createPOSOrder,
  updatePOSOrderStatus,
  voidPOSOrder,
} from '../../../app/api/client';
import type { ApiPOSOrder, POSOrderStatus } from '../../../app/api/domainTypes';
import { usePOSOrdersQuery } from '../domainQueries';
import { retailQueryKeys, useRetailMutation } from './shared';

export function useRetailPOSOrdersQuery<TData = ApiPOSOrder[]>(
  params?: {
    status?: string;
    paymentStatus?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  },
  select?: (items: ApiPOSOrder[]) => TData,
) {
  return usePOSOrdersQuery({ module: 'RETAIL', ...params }, { select });
}

export function useCreateRetailPOSOrderMutation() {
  return useRetailMutation(
    (data: Record<string, unknown>) =>
      createPOSOrder({ ...data, module: 'RETAIL', orderType: data.orderType ?? 'RETAIL' }),
    [retailQueryKeys.posOrders],
  );
}

export function useCompleteRetailPOSOrderPaymentMutation() {
  return useRetailMutation(
    ({ id, amountPaid, paymentMethod, receiptData }: {
      id: string;
      amountPaid: number;
      paymentMethod: string;
      receiptData?: unknown;
    }) => completePOSOrderPayment(id, { amountPaid, paymentMethod, receiptData }, 'RETAIL'),
    [retailQueryKeys.posOrders],
  );
}

export function useUpdateRetailPOSOrderStatusMutation() {
  return useRetailMutation(
    ({ id, status, notes }: { id: string; status: POSOrderStatus; notes?: string }) =>
      updatePOSOrderStatus(id, status, 'RETAIL', notes),
    [retailQueryKeys.posOrders],
  );
}

export function useVoidRetailPOSOrderMutation() {
  return useRetailMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      voidPOSOrder(id, reason, 'RETAIL'),
    [retailQueryKeys.posOrders],
  );
}
