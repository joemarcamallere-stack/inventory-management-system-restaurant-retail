import {
  getGoodsReceipts,
  getPurchaseOrders,
  getStockMovements,
  getSuppliers,
  getTransfers,
  getUsers,
  upsertRestaurantSetting,
} from '../../../app/api/client';
import {
  domainQueryKeys,
  useDomainMutation,
  useRestaurantSettingsQuery,
} from '../domainQueries';
import { restaurantInventoryLoader } from './inventoryQueries';

export const restaurantQueryLoaders = {
  inventory: restaurantInventoryLoader,
  purchaseOrders: () => getPurchaseOrders({ module: 'RESTAURANT' }),
  goodsReceipts: () => getGoodsReceipts({ module: 'RESTAURANT' }),
  suppliers: () => getSuppliers({ module: 'RESTAURANT' }),
  transfers: () => getTransfers({ module: 'RESTAURANT' }),
  stockMovements: () => getStockMovements({ module: 'RESTAURANT' }),
  users: getUsers,
};

export function useRestaurantSettings() {
  return useRestaurantSettingsQuery();
}

export function useUpsertRestaurantSettingMutation() {
  return useDomainMutation(
    ({
      key,
      value,
    }: {
      key: Parameters<typeof upsertRestaurantSetting>[0];
      value: unknown;
    }) => upsertRestaurantSetting(key, value),
    [domainQueryKeys.restaurantSettings],
  );
}
