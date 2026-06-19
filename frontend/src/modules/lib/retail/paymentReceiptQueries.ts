import { markReceiptPrinted } from '../../../app/api/client';
import type { ApiPayment, ApiReceipt, PaymentStatus } from '../../../app/api/domainTypes';
import { usePaymentsQuery, useReceiptsQuery } from '../domainQueries';
import { retailQueryKeys, useRetailMutation } from './shared';

export function useRetailPaymentsQuery<TData = ApiPayment[]>(
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
  return usePaymentsQuery({ module: 'RETAIL', ...params }, { select });
}

export function useRetailReceiptsQuery<TData = ApiReceipt[]>(
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
  return useReceiptsQuery({ module: 'RETAIL', ...params }, { select });
}

export function useMarkRetailReceiptPrintedMutation() {
  return useRetailMutation(
    (id: string) => markReceiptPrinted(id, 'RETAIL'),
    [retailQueryKeys.receipts],
  );
}
