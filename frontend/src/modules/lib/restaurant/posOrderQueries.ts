import {
  completePOSOrderPayment,
  createPOSOrder,
  updatePOSOrderStatus,
  voidPOSOrder,
} from '../../../app/api/client';
import type { ApiPOSOrder, POSOrderStatus } from '../../../app/api/domainTypes';
import { usePOSOrdersQuery } from '../domainQueries';
import { restaurantQueryKeys, useRestaurantMutation } from './shared';

export function useRestaurantPOSOrdersQuery<TData = ApiPOSOrder[]>(
  params?: {
    status?: string;
    paymentStatus?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  },
  select?: (items: ApiPOSOrder[]) => TData,
) {
  return usePOSOrdersQuery({ module: 'RESTAURANT', ...params }, { select });
}

export function useCreateRestaurantPOSOrderMutation() {
  return useRestaurantMutation(
    (data: Record<string, unknown>) =>
      createPOSOrder({ ...data, module: 'RESTAURANT' }),
    [restaurantQueryKeys.posOrders],
  );
}

export function useCompleteRestaurantPOSOrderPaymentMutation() {
  return useRestaurantMutation(
    ({ id, amountPaid, paymentMethod, receiptData }: {
      id: string;
      amountPaid: number;
      paymentMethod: string;
      receiptData?: unknown;
    }) => completePOSOrderPayment(id, { amountPaid, paymentMethod, receiptData }, 'RESTAURANT'),
    [restaurantQueryKeys.posOrders],
  );
}

export function useUpdateRestaurantPOSOrderStatusMutation() {
  return useRestaurantMutation(
    ({ id, status, notes }: { id: string; status: POSOrderStatus; notes?: string }) =>
      updatePOSOrderStatus(id, status, 'RESTAURANT', notes),
    [restaurantQueryKeys.posOrders],
  );
}

export function useVoidRestaurantPOSOrderMutation() {
  return useRestaurantMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      voidPOSOrder(id, reason, 'RESTAURANT'),
    [restaurantQueryKeys.posOrders],
  );
}
