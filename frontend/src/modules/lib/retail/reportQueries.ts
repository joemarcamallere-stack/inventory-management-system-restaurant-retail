import type {
  ApiPeriodReportQuery,
  ApiReportQuery,
  ApiSalesByItem,
  ApiSalesByPaymentMethod,
  ApiSalesByPeriodPoint,
  ApiSalesSummary,
  ApiTopReportQuery,
} from '../../../app/api/domainTypes';
import {
  useSalesByItemQuery,
  useSalesByPaymentMethodQuery,
  useSalesByPeriodQuery,
  useSalesSummaryQuery,
} from '../domainQueries';

export function useRetailSalesSummaryQuery<TData = ApiSalesSummary>(
  params?: Omit<ApiReportQuery, 'module'>,
  select?: (summary: ApiSalesSummary) => TData,
) {
  return useSalesSummaryQuery({ ...params, module: 'RETAIL' }, { select });
}

export function useRetailSalesByPeriodQuery<TData = ApiSalesByPeriodPoint[]>(
  params?: Omit<ApiPeriodReportQuery, 'module'>,
  select?: (items: ApiSalesByPeriodPoint[]) => TData,
) {
  return useSalesByPeriodQuery({ ...params, module: 'RETAIL' }, { select });
}

export function useRetailSalesByPaymentMethodQuery<TData = ApiSalesByPaymentMethod[]>(
  params?: Omit<ApiReportQuery, 'module'>,
  select?: (items: ApiSalesByPaymentMethod[]) => TData,
) {
  return useSalesByPaymentMethodQuery({ ...params, module: 'RETAIL' }, { select });
}

export function useRetailSalesByItemQuery<TData = ApiSalesByItem[]>(
  params?: Omit<ApiTopReportQuery, 'module'>,
  select?: (items: ApiSalesByItem[]) => TData,
) {
  return useSalesByItemQuery({ ...params, module: 'RETAIL' }, { select });
}
