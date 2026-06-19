import { markReceiptPrinted } from '../../../app/api/client';
import type { ApiPayment, ApiReceipt, PaymentStatus } from '../../../app/api/domainTypes';
import { usePaymentsQuery, useReceiptsQuery } from '../domainQueries';
import { restaurantQueryKeys, useRestaurantMutation } from './shared';

export function useRestaurantPaymentsQuery<TData = ApiPayment[]>(
  params?: {
    method?: string;
    status?: PaymentStatus;
    saleId?: string;
    posOrderId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
  select?: (items: ApiPayment[]) => TData,
) {
  return usePaymentsQuery({ module: 'RESTAURANT', ...params }, { select });
}

export function useRestaurantReceiptsQuery<TData = ApiReceipt[]>(
  params?: {
    saleId?: string;
    posOrderId?: string;
    paymentId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
  select?: (items: ApiReceipt[]) => TData,
) {
  return useReceiptsQuery({ module: 'RESTAURANT', ...params }, { select });
}

export function useMarkRestaurantReceiptPrintedMutation() {
  return useRestaurantMutation(
    (id: string) => markReceiptPrinted(id, 'RESTAURANT'),
    [restaurantQueryKeys.receipts],
  );
}
