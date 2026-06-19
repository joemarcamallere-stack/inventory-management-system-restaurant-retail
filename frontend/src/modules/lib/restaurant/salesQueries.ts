import { getSales, refundSale } from '../../../app/api/client';
import { restaurantQueryKeys, useRestaurantMutation } from './shared';
import { useSalesQuery } from '../domainQueries';

export function useRestaurantSalesQuery<
  TData = Awaited<ReturnType<typeof getSales>>,
>(select?: (items: Awaited<ReturnType<typeof getSales>>) => TData) {
  return useSalesQuery(
    { module: 'RESTAURANT' },
    select ? { select } : undefined,
  );
}

export function useRefundRestaurantSaleMutation() {
  return useRestaurantMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      refundSale(id, reason, 'RESTAURANT'),
    [
      restaurantQueryKeys.inventory,
      restaurantQueryKeys.stockMovements,
      restaurantQueryKeys.sales,
      restaurantQueryKeys.posOrders,
      restaurantQueryKeys.payments,
      restaurantQueryKeys.reports,
    ],
  );
}
