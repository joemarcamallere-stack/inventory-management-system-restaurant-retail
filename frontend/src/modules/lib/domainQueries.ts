import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  getBundles,
  getGoodsReceipts,
  getInventory,
  getKitchenOrders,
  getLocations,
  getPurchaseOrders,
  getRecipes,
  getRestaurantSettings,
  getSales,
  getStockMovements,
  getSuppliers,
  getTransfers,
  getUsers,
  type KitchenOrderStatus,
} from '../../app/api/client';
import type {
  RetailApiBundle,
  RetailApiGoodsReceipt,
  RetailApiInventoryItem,
  RetailApiLocation,
  RetailApiPurchaseOrder,
  RetailApiSale,
  RetailApiStockMovement,
  RetailApiSupplier,
  RetailApiTransfer,
  RetailApiUser,
} from '../../app/api/retailTypes';

export const domainQueryKeys = {
  inventory: ['inventory'] as const,
  locations: ['locations'] as const,
  users: ['users'] as const,
  purchaseOrders: ['purchase-orders'] as const,
  goodsReceipts: ['goods-receipts'] as const,
  suppliers: ['suppliers'] as const,
  transfers: ['transfers'] as const,
  stockMovements: ['stock-movements'] as const,
  sales: ['sales'] as const,
  bundles: ['bundles'] as const,
  recipes: ['recipes'] as const,
  kitchenOrders: ['kitchen-orders'] as const,
  restaurantSettings: ['restaurant-settings'] as const,
};

type SelectOptions<TQueryFnData, TData> = Pick<
  UseQueryOptions<TQueryFnData, Error, TData>,
  'enabled' | 'select'
>;

export function useInventoryQuery<TData = RetailApiInventoryItem[]>(
  params?: { search?: string; itemType?: string },
  options?: SelectOptions<RetailApiInventoryItem[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.inventory, params ?? {}],
    queryFn: () => getInventory(params),
    ...options,
  });
}

export function useLocationsQuery<TData = RetailApiLocation[]>(
  options?: SelectOptions<RetailApiLocation[], TData>,
) {
  return useQuery({
    queryKey: domainQueryKeys.locations,
    queryFn: getLocations,
    ...options,
  });
}

export function useUsersQuery<TData = RetailApiUser[]>(
  options?: SelectOptions<RetailApiUser[], TData>,
) {
  return useQuery({
    queryKey: domainQueryKeys.users,
    queryFn: getUsers,
    ...options,
  });
}

export function usePurchaseOrdersQuery<TData = RetailApiPurchaseOrder[]>(
  params?: { status?: string; supplierId?: string },
  options?: SelectOptions<RetailApiPurchaseOrder[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.purchaseOrders, params ?? {}],
    queryFn: () => getPurchaseOrders(params),
    ...options,
  });
}

export function useGoodsReceiptsQuery<TData = RetailApiGoodsReceipt[]>(
  params?: { purchaseOrderId?: string },
  options?: SelectOptions<RetailApiGoodsReceipt[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.goodsReceipts, params ?? {}],
    queryFn: () => getGoodsReceipts(params),
    ...options,
  });
}

export function useSuppliersQuery<TData = RetailApiSupplier[]>(
  params?: { isActive?: boolean },
  options?: SelectOptions<RetailApiSupplier[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.suppliers, params ?? {}],
    queryFn: () => getSuppliers(params),
    ...options,
  });
}

export function useTransfersQuery<TData = RetailApiTransfer[]>(
  params?: { status?: string; fromLocationId?: string; toLocationId?: string },
  options?: SelectOptions<RetailApiTransfer[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.transfers, params ?? {}],
    queryFn: () => getTransfers(params),
    ...options,
  });
}

export function useStockMovementsQuery<TData = RetailApiStockMovement[]>(
  params?: {
    itemId?: string;
    locationId?: string;
    type?: string;
    referenceType?: string;
    referenceId?: string;
  },
  options?: SelectOptions<RetailApiStockMovement[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.stockMovements, params ?? {}],
    queryFn: () => getStockMovements(params),
    ...options,
  });
}

export function useSalesQuery<TData = RetailApiSale[]>(
  params?: { locationId?: string; status?: string; dateFrom?: string; dateTo?: string },
  options?: SelectOptions<RetailApiSale[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.sales, params ?? {}],
    queryFn: () => getSales(params),
    ...options,
  });
}

export function useBundlesQuery<TData = RetailApiBundle[]>(
  params?: { status?: string },
  options?: SelectOptions<RetailApiBundle[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.bundles, params ?? {}],
    queryFn: () => getBundles(params),
    ...options,
  });
}

export function useRecipesQuery<TData = any[]>(
  params?: { active?: boolean },
  options?: SelectOptions<any[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.recipes, params ?? {}],
    queryFn: () => getRecipes(params),
    ...options,
  });
}

export function useKitchenOrdersQuery<TData = any[]>(
  params?: { status?: KitchenOrderStatus },
  options?: SelectOptions<any[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.kitchenOrders, params ?? {}],
    queryFn: () => getKitchenOrders(params),
    ...options,
  });
}

export function useRestaurantSettingsQuery<TData = Awaited<ReturnType<typeof getRestaurantSettings>>>(
  options?: SelectOptions<Awaited<ReturnType<typeof getRestaurantSettings>>, TData>,
) {
  return useQuery({
    queryKey: domainQueryKeys.restaurantSettings,
    queryFn: getRestaurantSettings,
    ...options,
  });
}

export function useDomainMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: QueryKey[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all(
        invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}

export function useInvalidateDomains() {
  const queryClient = useQueryClient();
  return (...queryKeys: QueryKey[]) =>
    Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
