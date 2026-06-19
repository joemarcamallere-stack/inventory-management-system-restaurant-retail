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

export function useRestaurantSalesSummaryQuery<TData = ApiSalesSummary>(
  params?: Omit<ApiReportQuery, 'module'>,
  select?: (summary: ApiSalesSummary) => TData,
) {
  return useSalesSummaryQuery({ ...params, module: 'RESTAURANT' }, { select });
}

export function useRestaurantSalesByPeriodQuery<TData = ApiSalesByPeriodPoint[]>(
  params?: Omit<ApiPeriodReportQuery, 'module'>,
  select?: (items: ApiSalesByPeriodPoint[]) => TData,
) {
  return useSalesByPeriodQuery({ ...params, module: 'RESTAURANT' }, { select });
}

export function useRestaurantSalesByPaymentMethodQuery<TData = ApiSalesByPaymentMethod[]>(
  params?: Omit<ApiReportQuery, 'module'>,
  select?: (items: ApiSalesByPaymentMethod[]) => TData,
) {
  return useSalesByPaymentMethodQuery({ ...params, module: 'RESTAURANT' }, { select });
}

export function useRestaurantSalesByItemQuery<TData = ApiSalesByItem[]>(
  params?: Omit<ApiTopReportQuery, 'module'>,
  select?: (items: ApiSalesByItem[]) => TData,
) {
  return useSalesByItemQuery({ ...params, module: 'RESTAURANT' }, { select });
}
