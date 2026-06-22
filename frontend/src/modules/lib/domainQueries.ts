import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  getBundles,
  getDiningTables,
  getGoodsReceipts,
  getIngredientAlternatives,
  getInventory,
  getKitchenOrders,
  getLocations,
  getBusinessSettings,
  getPayments,
  getPOSOrders,
  getPOSSettings,
  getPurchaseOrders,
  getReceipts,
  getRecipes,
  getRestaurantSettings,
  getSalesByCashier,
  getSalesByItem,
  getSalesByLocation,
  getSalesByOrderType,
  getSalesByPaymentMethod,
  getSalesByPeriod,
  getSalesSummary,
  getSales,
  getStockMovements,
  getSuppliers,
  getTransfers,
  getUsers,
  upsertBusinessSetting,
  upsertPOSSetting,
  type KitchenOrderStatus,
  type DiningTableStatus,
} from '../../app/api/client';
import type {
  ApiBundle,
  ApiBusinessSetting,
  ApiDiningTable,
  ApiGoodsReceipt,
  ApiIngredientAlternative,
  ApiInventoryItem,
  ApiKitchenOrder,
  ApiLocation,
  ApiPayment,
  ApiPOSOrder,
  ApiPOSSetting,
  ApiPeriodReportQuery,
  ApiPurchaseOrder,
  ApiRecipe,
  ApiReceipt,
  ApiReportQuery,
  ApiSale,
  ApiSalesByCashier,
  ApiSalesByItem,
  ApiSalesByLocation,
  ApiSalesByOrderType,
  ApiSalesByPaymentMethod,
  ApiSalesByPeriodPoint,
  ApiSalesSummary,
  ApiStockMovement,
  ApiSupplier,
  ApiTopReportQuery,
  ApiTransfer,
  ApiUser,
  BusinessModule,
  PaymentStatus,
  POSOrderStatus,
} from '../../app/api/domainTypes';

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
  diningTables: ['dining-tables'] as const,
  restaurantSettings: ['restaurant-settings'] as const,
  businessSettings: ['business-settings'] as const,
  posSettings: ['pos-settings'] as const,
  posOrders: ['pos-orders'] as const,
  payments: ['payments'] as const,
  receipts: ['receipts'] as const,
  reports: ['reports'] as const,
  ingredientAlternatives: ['ingredient-alternatives'] as const,
};

const domainInvalidationDependencies = new Map<string, QueryKey[]>([
  ['inventory', [
    domainQueryKeys.stockMovements,
    domainQueryKeys.transfers,
    domainQueryKeys.bundles,
    domainQueryKeys.purchaseOrders,
    domainQueryKeys.goodsReceipts,
  ]],
  ['locations', [
    domainQueryKeys.inventory,
    domainQueryKeys.transfers,
    domainQueryKeys.sales,
    domainQueryKeys.bundles,
  ]],
  ['purchase-orders', [
    domainQueryKeys.goodsReceipts,
    domainQueryKeys.inventory,
    domainQueryKeys.stockMovements,
  ]],
  ['goods-receipts', [
    domainQueryKeys.purchaseOrders,
    domainQueryKeys.inventory,
    domainQueryKeys.stockMovements,
  ]],
  ['suppliers', [domainQueryKeys.purchaseOrders]],
  ['transfers', [domainQueryKeys.inventory, domainQueryKeys.stockMovements]],
  ['stock-movements', [domainQueryKeys.inventory]],
  ['sales', [domainQueryKeys.inventory, domainQueryKeys.stockMovements]],
  ['pos-orders', [
    domainQueryKeys.sales,
    domainQueryKeys.inventory,
    domainQueryKeys.stockMovements,
    domainQueryKeys.payments,
    domainQueryKeys.receipts,
    domainQueryKeys.reports,
    domainQueryKeys.diningTables,
  ]],
  ['payments', [domainQueryKeys.sales, domainQueryKeys.posOrders, domainQueryKeys.receipts]],
  ['receipts', [domainQueryKeys.payments, domainQueryKeys.posOrders]],
  ['reports', [domainQueryKeys.sales]],
  ['bundles', [domainQueryKeys.inventory]],
  ['recipes', [domainQueryKeys.kitchenOrders]],
  ['ingredient-alternatives', [domainQueryKeys.inventory]],
  ['kitchen-orders', [
    domainQueryKeys.inventory,
    domainQueryKeys.stockMovements,
    domainQueryKeys.sales,
    domainQueryKeys.diningTables,
  ]],
  ['dining-tables', [domainQueryKeys.posOrders, domainQueryKeys.kitchenOrders]],
]);

function expandInvalidationKeys(queryKeys: QueryKey[]) {
  const expanded = queryKeys.flatMap((queryKey) => [
    queryKey,
    ...(domainInvalidationDependencies.get(String(queryKey[0])) ?? []),
  ]);
  return Array.from(
    new Map(expanded.map((queryKey) => [JSON.stringify(queryKey), queryKey])).values(),
  );
}

type SelectOptions<TQueryFnData, TData> = Pick<
  UseQueryOptions<TQueryFnData, Error, TData>,
  'enabled' | 'select'
>;

export function useInventoryQuery<TData = ApiInventoryItem[]>(
  params?: { search?: string; itemType?: string },
  options?: SelectOptions<ApiInventoryItem[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.inventory, params ?? {}],
    queryFn: () => getInventory(params),
    ...options,
  });
}

export function useLocationsQuery<TData = ApiLocation[]>(
  options?: SelectOptions<ApiLocation[], TData>,
) {
  return useQuery({
    queryKey: domainQueryKeys.locations,
    queryFn: getLocations,
    ...options,
  });
}

export function useUsersQuery<TData = ApiUser[]>(
  options?: SelectOptions<ApiUser[], TData>,
) {
  return useQuery({
    queryKey: domainQueryKeys.users,
    queryFn: getUsers,
    ...options,
  });
}

export function usePurchaseOrdersQuery<TData = ApiPurchaseOrder[]>(
  params?: { module?: BusinessModule; status?: string; supplierId?: string },
  options?: SelectOptions<ApiPurchaseOrder[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.purchaseOrders, params ?? {}],
    queryFn: () => getPurchaseOrders(params),
    ...options,
  });
}

export function useGoodsReceiptsQuery<TData = ApiGoodsReceipt[]>(
  params?: { module?: BusinessModule; purchaseOrderId?: string },
  options?: SelectOptions<ApiGoodsReceipt[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.goodsReceipts, params ?? {}],
    queryFn: () => getGoodsReceipts(params),
    ...options,
  });
}

export function useSuppliersQuery<TData = ApiSupplier[]>(
  params?: { module?: BusinessModule; isActive?: boolean },
  options?: SelectOptions<ApiSupplier[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.suppliers, params ?? {}],
    queryFn: () => getSuppliers(params),
    ...options,
  });
}

export function useTransfersQuery<TData = ApiTransfer[]>(
  params?: {
    module?: BusinessModule;
    status?: string;
    fromLocationId?: string;
    toLocationId?: string;
  },
  options?: SelectOptions<ApiTransfer[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.transfers, params ?? {}],
    queryFn: () => getTransfers(params),
    ...options,
  });
}

export function useStockMovementsQuery<TData = ApiStockMovement[]>(
  params?: {
    module?: BusinessModule;
    itemId?: string;
    locationId?: string;
    type?: string;
    referenceType?: string;
    referenceId?: string;
  },
  options?: SelectOptions<ApiStockMovement[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.stockMovements, params ?? {}],
    queryFn: () => getStockMovements(params),
    ...options,
  });
}

export function useSalesQuery<TData = ApiSale[]>(
  params?: {
    module?: BusinessModule;
    locationId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
  options?: SelectOptions<ApiSale[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.sales, params ?? {}],
    queryFn: () => getSales(params),
    ...options,
  });
}

export function usePOSOrdersQuery<TData = ApiPOSOrder[]>(
  params?: {
    module?: BusinessModule;
    status?: string;
    paymentStatus?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  },
  options?: SelectOptions<ApiPOSOrder[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.posOrders, params ?? {}],
    queryFn: () => getPOSOrders(params),
    ...options,
  });
}

export function usePaymentsQuery<TData = ApiPayment[]>(
  params?: {
    module?: BusinessModule;
    method?: string;
    status?: PaymentStatus;
    saleId?: string;
    posOrderId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
  options?: SelectOptions<ApiPayment[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.payments, params ?? {}],
    queryFn: () => getPayments(params),
    ...options,
  });
}

export function useReceiptsQuery<TData = ApiReceipt[]>(
  params?: {
    module?: BusinessModule;
    saleId?: string;
    posOrderId?: string;
    paymentId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  },
  options?: SelectOptions<ApiReceipt[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.receipts, params ?? {}],
    queryFn: () => getReceipts(params),
    ...options,
  });
}

export function useBusinessSettingsQuery<TData = ApiBusinessSetting[]>(
  options?: SelectOptions<ApiBusinessSetting[], TData>,
) {
  return useQuery({
    queryKey: domainQueryKeys.businessSettings,
    queryFn: getBusinessSettings,
    ...options,
  });
}

export function usePOSSettingsQuery<TData = ApiPOSSetting[]>(
  params?: { module?: BusinessModule },
  options?: SelectOptions<ApiPOSSetting[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.posSettings, params ?? {}],
    queryFn: () => getPOSSettings(params),
    ...options,
  });
}

export function useSalesSummaryQuery<TData = ApiSalesSummary>(
  params?: ApiReportQuery,
  options?: SelectOptions<ApiSalesSummary, TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.reports, 'sales-summary', params ?? {}],
    queryFn: () => getSalesSummary(params),
    ...options,
  });
}

export function useSalesByPeriodQuery<TData = ApiSalesByPeriodPoint[]>(
  params?: ApiPeriodReportQuery,
  options?: SelectOptions<ApiSalesByPeriodPoint[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.reports, 'sales-by-period', params ?? {}],
    queryFn: () => getSalesByPeriod(params),
    ...options,
  });
}

export function useSalesByPaymentMethodQuery<TData = ApiSalesByPaymentMethod[]>(
  params?: ApiReportQuery,
  options?: SelectOptions<ApiSalesByPaymentMethod[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.reports, 'sales-by-payment-method', params ?? {}],
    queryFn: () => getSalesByPaymentMethod(params),
    ...options,
  });
}

export function useSalesByItemQuery<TData = ApiSalesByItem[]>(
  params?: ApiTopReportQuery,
  options?: SelectOptions<ApiSalesByItem[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.reports, 'sales-by-item', params ?? {}],
    queryFn: () => getSalesByItem(params),
    ...options,
  });
}

export function useSalesByLocationQuery<TData = ApiSalesByLocation[]>(
  params?: ApiReportQuery,
  options?: SelectOptions<ApiSalesByLocation[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.reports, 'sales-by-location', params ?? {}],
    queryFn: () => getSalesByLocation(params),
    ...options,
  });
}

export function useSalesByCashierQuery<TData = ApiSalesByCashier[]>(
  params?: ApiReportQuery,
  options?: SelectOptions<ApiSalesByCashier[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.reports, 'sales-by-cashier', params ?? {}],
    queryFn: () => getSalesByCashier(params),
    ...options,
  });
}

export function useSalesByOrderTypeQuery<TData = ApiSalesByOrderType[]>(
  params?: ApiReportQuery,
  options?: SelectOptions<ApiSalesByOrderType[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.reports, 'sales-by-order-type', params ?? {}],
    queryFn: () => getSalesByOrderType(params),
    ...options,
  });
}

export function useBundlesQuery<TData = ApiBundle[]>(
  params?: { status?: string },
  options?: SelectOptions<ApiBundle[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.bundles, params ?? {}],
    queryFn: () => getBundles(params),
    ...options,
  });
}

export function useRecipesQuery<TData = ApiRecipe[]>(
  params?: { active?: boolean },
  options?: SelectOptions<ApiRecipe[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.recipes, params ?? {}],
    queryFn: () => getRecipes(params),
    ...options,
  });
}

export function useIngredientAlternativesQuery<TData = ApiIngredientAlternative[]>(
  options?: SelectOptions<ApiIngredientAlternative[], TData>,
) {
  return useQuery({
    queryKey: domainQueryKeys.ingredientAlternatives,
    queryFn: getIngredientAlternatives,
    ...options,
  });
}

export function useKitchenOrdersQuery<TData = ApiKitchenOrder[]>(
  params?: { status?: KitchenOrderStatus },
  options?: SelectOptions<ApiKitchenOrder[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.kitchenOrders, params ?? {}],
    queryFn: () => getKitchenOrders(params),
    ...options,
  });
}

export function useDiningTablesQuery<TData = ApiDiningTable[]>(
  params?: {
    locationId?: string;
    status?: DiningTableStatus;
    page?: number;
    limit?: number;
  },
  options?: SelectOptions<ApiDiningTable[], TData>,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.diningTables, params ?? {}],
    queryFn: () => getDiningTables(params),
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
        expandInvalidationKeys(invalidateKeys).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

export function useUpsertBusinessSettingMutation() {
  return useDomainMutation(
    ({ key, value }: { key: string; value: unknown }) =>
      upsertBusinessSetting(key, value),
    [domainQueryKeys.businessSettings],
  );
}

export function useUpsertPOSSettingMutation() {
  return useDomainMutation(
    ({ module, key, value }: { module: BusinessModule; key: string; value: unknown }) =>
      upsertPOSSetting(module, key, value),
    [domainQueryKeys.posSettings],
  );
}

export function useInvalidateDomains() {
  const queryClient = useQueryClient();
  return (...queryKeys: QueryKey[]) =>
    Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
