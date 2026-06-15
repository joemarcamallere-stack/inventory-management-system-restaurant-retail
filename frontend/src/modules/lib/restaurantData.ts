import {
  MutationCache,
  QueryCache,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import {
  getInventory,
  getGoodsReceipts,
  getKitchenOrders,
  getPurchaseOrders,
  getRecipes,
  getRestaurantSettings,
  getStockMovements,
  getSuppliers,
  getTransfers,
  getUsers,
} from '../../app/api/client';

const browserOnlyKeys = new Set(['userRole', 'userEmail']);
const restaurantMemory = new Map<string, unknown>();
export const restaurantQueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => dispatchSyncError("query", error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => dispatchSyncError("mutation", error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function readRestaurantData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  if (!browserOnlyKeys.has(key)) {
    return (restaurantMemory.get(key) as T | undefined) ?? fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeRestaurantData<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  if (browserOnlyKeys.has(key)) {
    window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return;
  }
  restaurantMemory.set(key, value);
  restaurantQueryClient.setQueryData(['restaurant', key], value);
}

export function writeRestaurantDataOnly<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  restaurantMemory.set(key, value);
}

export function useRestaurantState<T extends object>(
  key: string,
  fallback: T,
): readonly [T, Dispatch<SetStateAction<T>>] {
  const queryClient = useQueryClient();
  const query = useQuery<T, Error, T, readonly unknown[]>({
    queryKey: ['restaurant', key],
    queryFn: async () => (await loadRestaurantKeyFromApi(key) as T | undefined) ?? fallback,
  });
  const setValue: Dispatch<SetStateAction<T>> = (next) => {
    queryClient.setQueryData<T>(['restaurant', key], (current) => {
      const resolved = typeof next === 'function'
        ? (next as (previous: T) => T)(current ?? fallback)
        : next;
      restaurantMemory.set(key, resolved);
      return resolved;
    });
  };
  return [query.data ?? fallback, setValue] as const;
}

export function useInvalidateRestaurantData() {
  const queryClient = useQueryClient();
  return (...keys: string[]) => Promise.all(
    keys.map((key) => queryClient.invalidateQueries({ queryKey: ['restaurant', key] })),
  );
}

export function useRestaurantMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: string[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all(
        invalidateKeys.map((key) =>
          queryClient.invalidateQueries({ queryKey: ['restaurant', key] }),
        ),
      );
    },
  });
}

function readRaw<T>(key: string, fallback: T): T {
  return (restaurantMemory.get(key) as T | undefined) ?? fallback;
}

function writeRaw<T>(key: string, value: T) {
  restaurantMemory.set(key, value);
}

function dispatchSyncError(key: string, error: unknown) {
  console.error('[Restaurant API] Request failed:', key, error);
  window.dispatchEvent(
    new CustomEvent('restaurant-sync-error', {
      detail: { key, message: error instanceof Error ? error.message : String(error) },
    }),
  );
}

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

async function getFoodItems() {
  const groups = await Promise.all([
    getInventory({ itemType: 'INGREDIENT' }),
    getInventory({ itemType: 'MENU_ITEM' }),
    getInventory({ itemType: 'SUPPLY' }),
  ]);
  return groups.flat();
}

function mapInventory(items: any[]) {
  const idMap: Record<string, string> = {};
  const products = items.map((item: any, index: number) => {
    idMap[String(index + 1)] = item.id;
    return {
      id: index + 1,
      backendId: item.id,
      locationId: item.locationId,
      name: item.name,
      itemType: item.itemType ?? 'INGREDIENT',
      sku: item.sku ?? `REST-${index + 1}`,
      category: item.category?.includes(' > ')
        ? item.category
        : `${item.category || 'Uncategorized'} > ${item.subcategory || 'General'}`,
      stock: item.quantity ?? 0,
      maxStock: item.maxStock ?? Math.max(item.quantity ?? 0, item.reorderPoint ?? 0, 1),
      minStock: item.minStock ?? item.reorderPoint ?? 0,
      reorderPoint: item.reorderPoint ?? item.minStock ?? 0,
      price: item.price ?? 0,
      expiry: toDateInput(item.expiryDate),
      location: item.location?.name ?? 'Unassigned',
      unit: item.unit ?? 'pcs',
      storageTemperature: item.storageTemperature ?? 'Dry Storage',
    };
  });
  writeRaw('inventory.backendIdByLocalId', idMap);
  restaurantMemory.set('inventory.products', products);
  return products;
}

async function loadRestaurantKeyFromApi(key: string): Promise<unknown> {
  if (key === 'inventory.products' || key === 'purchaseOrders.globalProducts') {
    const items = await getFoodItems();
    const products = mapInventory(items);
    if (key === 'purchaseOrders.globalProducts') {
      return products.map((product: any) => {
        const [category = 'Other', subCategory = 'General'] = product.category.split(' > ');
        return {
          id: product.backendId,
          backendId: product.backendId,
          inventoryId: product.id,
          name: product.name,
          sku: product.sku,
          category,
          subCategory,
          unit: product.unit,
        };
      });
    }
    return products;
  }

  if (key === 'purchaseOrders.suppliers') {
    return (await getSuppliers()).map((supplier: any) => ({
      id: supplier.id,
      backendId: supplier.id,
      name: supplier.name,
      contact: supplier.contactPerson ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      products: [],
    }));
  }

  if (key === 'purchaseOrders.orders' || key === 'dashboard.pendingOrders') {
    const orders = await getPurchaseOrders();
    const items = await getFoodItems();
    const products = mapInventory(items);
    const localIdByBackend = new Map(products.map((item: any) => [item.backendId, item.id]));
    const mapped = orders.map((order: any) => ({
      id: order.id,
      backendId: order.id,
      supplier: order.supplier?.name ?? '',
      supplierId: order.supplierId,
      date: toDateInput(order.createdAt),
      items: order.items?.length ?? 0,
      orderItems: (order.items ?? []).map((item: any) => ({
        backendId: item.id,
        inventoryId: localIdByBackend.get(item.inventoryItemId),
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        category: item.inventoryItem?.category ?? '',
        subCategory: item.inventoryItem?.subcategory ?? '',
        unit: item.inventoryItem?.unit ?? 'pcs',
      })),
      total: order.totalAmount,
      status: ({
        DRAFT: 'pending',
        SUBMITTED: 'pending',
        APPROVED: 'approved',
        PARTIALLY_RECEIVED: 'partial',
        RECEIVED: 'received',
        REJECTED: 'rejected',
        CANCELLED: 'cancelled',
      } as Record<string, string>)[order.status] ?? order.status.toLowerCase(),
      expectedDelivery: toDateInput(order.expectedDelivery),
      createdBy: order.createdBy?.name ?? order.createdBy?.email ?? '',
      createdAt: order.createdAt,
      rejectionNote: order.rejectionReason,
      backendStatus: order.status,
    }));
    restaurantMemory.set('purchaseOrders.orders', mapped);
    writeRaw(
      'purchaseOrders.backendIdByLocalId',
      Object.fromEntries(orders.map((order: any) => [String(order.id), order.id])),
    );
    if (key === 'dashboard.pendingOrders') {
      return mapped.filter((order: any) => order.backendStatus === 'SUBMITTED');
    }
    return mapped;
  }

  if (key === 'goodsReceived.records') {
    const [receipts, orders] = await Promise.all([getGoodsReceipts(), getPurchaseOrders()]);
    const received = receipts.map((receipt: any) => ({
      id: receipt.receiptNumber,
      backendId: receipt.id,
      poId: receipt.purchaseOrderId,
      supplier: receipt.purchaseOrder?.supplier?.name ?? '',
      receivedDate: toDateInput(receipt.createdAt),
      items: receipt.items?.length ?? 0,
      receivedItems: (receipt.items ?? []).map((line: any) => ({
        backendItemId: line.id,
        productName: line.purchaseOrderItem?.name ?? line.inventoryItem?.name ?? 'Item',
        quantity: line.receivedQty + line.rejectedQty,
        acceptedQuantity: line.receivedQty,
        rejectedQuantity: line.rejectedQty,
        unit: line.inventoryItem?.unit ?? 'pcs',
        unitPrice: line.purchaseOrderItem?.unitPrice ?? 0,
        condition: line.condition ?? 'Inspected',
        qualityRemarks: line.notes ?? '',
      })),
      totalValue: (receipt.items ?? []).reduce(
        (sum: number, line: any) => sum + line.receivedQty * (line.purchaseOrderItem?.unitPrice ?? 0),
        0,
      ),
      receivedBy: receipt.receivedBy?.name ?? receipt.receivedBy?.email ?? '',
      status: (receipt.items ?? []).some((line: any) => line.rejectedQty > 0) ? 'partial' : 'verified',
      notes: receipt.notes ?? '',
    }));
    const pending = orders.filter((order: any) =>
      ['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status)
      && (order.items ?? []).some((item: any) => item.receivedQty + item.rejectedQty < item.quantity)
    ).map((order: any) => ({
      id: `GR-${order.orderNumber}`,
      poId: order.id,
      supplier: order.supplier?.name ?? '',
      receivedDate: toDateInput(order.expectedDelivery ?? order.createdAt),
      items: order.items?.length ?? 0,
      receivedItems: (order.items ?? []).map((item: any) => ({
        backendItemId: item.id,
        productName: item.name,
        quantity: item.quantity - item.receivedQty - item.rejectedQty,
        unit: item.inventoryItem?.unit ?? 'pcs',
        unitPrice: item.unitPrice,
        condition: 'Pending Check',
      })),
      totalValue: order.totalAmount,
      receivedBy: '',
      status: 'pending',
      notes: 'Approved PO. Awaiting goods receipt and quality check.',
    }));
    return [...pending, ...received];
  }

  if (key === 'recipes.records') {
    const [recipes, items] = await Promise.all([getRecipes(), getFoodItems()]);
    const products = mapInventory(items);
    const localIdByBackend = new Map(products.map((item: any) => [item.backendId, item.id]));
    return recipes.map((recipe: any) => {
      const ingredients = (recipe.ingredients ?? []).map((ingredient: any) => ({
        id: ingredient.id,
        productId: localIdByBackend.get(ingredient.itemId),
        productSku: ingredient.item?.sku,
        name: ingredient.item?.name ?? 'Ingredient',
        quantity: ingredient.quantity,
        unit: ingredient.unit ?? ingredient.item?.unit ?? 'pcs',
        inventoryQuantity: ingredient.quantity,
        inventoryUnit: ingredient.item?.unit ?? ingredient.unit ?? 'pcs',
        unitCost: ingredient.unitCost ?? ingredient.item?.price ?? 0,
        totalCost: (ingredient.unitCost ?? ingredient.item?.price ?? 0) * ingredient.quantity,
      }));
      const totalCost = ingredients.reduce((sum: number, ingredient: any) => sum + ingredient.totalCost, 0);
      return {
        id: recipe.id,
        name: recipe.name,
        category: recipe.category,
        servings: recipe.servings,
        yieldPercentage: recipe.yieldPercentage ?? 100,
        prepTime: recipe.prepTimeMinutes ?? 0,
        ingredients,
        totalCost,
        yieldAdjustedCost: totalCost,
        costPerServing: totalCost / Math.max(recipe.servings ?? 1, 1),
        targetFoodCost: recipe.targetFoodCost ?? 35,
        suggestedSellingPrice: recipe.sellingPrice ?? 0,
        sellingPrice: recipe.sellingPrice ?? 0,
        grossMargin: 0,
        isActive: recipe.isActive,
        instructions: recipe.instructions ?? '',
      };
    });
  }

  if (key === 'pos.orders') {
    const orders = await getKitchenOrders();
    const idMap = Object.fromEntries(orders.map((order: any) => [String(order.id), order.id]));
    writeRaw('pos.backendIdByLocalId', idMap);
    writeRaw(
      'pos.voidedSynced',
      Object.fromEntries(orders.filter((order: any) => order.status === 'VOIDED').map((order: any) => [String(order.id), true])),
    );
    return orders.map((order: any) => ({
      id: order.id,
      receiptNo: order.receiptNo,
      recipeId: order.recipeId,
      recipeName: order.recipe?.name ?? 'Recipe',
      quantity: order.quantity,
      status: order.status === 'VOIDED' ? 'voided' : 'completed',
      orderedAt: order.createdAt,
      completedBy: order.completedBy?.email ?? 'shared-backend',
      notes: order.notes ?? '',
      voidReason: order.voidReason,
      voidedAt: order.voidedAt,
    }));
  }

  if (['inventory.movements', 'transfers.adjustments', 'transfers.wasteLogs'].includes(key)) {
    const movements = await getStockMovements();
    if (key === 'transfers.adjustments') {
      return movements.filter((item: any) => item.type === 'ADJUSTMENT').map((item: any) => ({
        id: item.id, item: item.item?.name ?? 'Item', quantity: item.newQuantity,
        unit: item.unit ?? item.item?.unit ?? 'pcs', location: item.location?.name ?? '',
        type: 'correction', reason: item.reason ?? '', adjustedBy: item.createdBy?.name ?? '',
        date: toDateInput(item.createdAt), notes: item.notes ?? '',
      }));
    }
    if (key === 'transfers.wasteLogs') {
      return movements.filter((item: any) => ['SPOILAGE', 'EXPIRY'].includes(item.type)).map((item: any) => ({
        id: item.id, item: item.item?.name ?? 'Item', quantity: item.quantity,
        unit: item.unit ?? item.item?.unit ?? 'pcs', location: item.location?.name ?? '',
        wasteType: item.type === 'EXPIRY' ? 'expiry' : 'spoilage',
        unitCost: item.item?.costPrice ?? item.item?.price ?? 0,
        totalValue: item.quantity * (item.item?.costPrice ?? item.item?.price ?? 0),
        date: toDateInput(item.createdAt), loggedBy: item.createdBy?.name ?? '',
        source: 'manual', notes: item.notes ?? item.reason ?? '',
      }));
    }
    return movements.map((item: any) => ({
      id: item.id, type: item.type, source: item.referenceType ?? 'shared-backend',
      sourceId: item.referenceId ?? item.id, item: item.item?.name ?? 'Item',
      quantity: item.quantity, unit: item.unit ?? item.item?.unit ?? '',
      date: item.createdAt, notes: item.notes ?? item.reason ?? '',
    }));
  }

  if (key === 'transfers.records') {
    const transfers = await getTransfers();
    writeRaw(
      'transfers.backendIdByLocalId',
      Object.fromEntries(transfers.map((transfer: any) => [String(transfer.id), transfer.id])),
    );
    return transfers.map((transfer: any) => ({
      id: transfer.id, backendId: transfer.id,
      item: transfer.items?.[0]?.inventoryItem?.name ?? 'Multiple items',
      quantity: transfer.items?.[0]?.quantity ?? 0,
      unit: transfer.items?.[0]?.inventoryItem?.unit ?? 'pcs',
      from: transfer.fromLocation?.name ?? '', to: transfer.toLocation?.name ?? '',
      requestedBy: transfer.createdBy?.name ?? '', requestDate: toDateInput(transfer.createdAt),
      status: transfer.status === 'IN_TRANSIT' ? 'in-transit' : transfer.status.toLowerCase(),
      completedDate: toDateInput(transfer.completedAt), notes: transfer.notes ?? '',
    }));
  }

  if (key === 'users.records') {
    if (window.localStorage.getItem('userRole') !== 'admin') return [];
    return (await getUsers()).map((user: any, index: number) => ({
      id: index + 1, backendId: user.id, name: user.name, email: user.email,
      phone: '', role: user.role.toLowerCase(), status: user.status.toLowerCase(),
      lastLogin: user.lastLogin,
      avatar: user.name.split(' ').map((part: string) => part[0]).join('').slice(0, 2),
    }));
  }

  if (key === 'inventory.categoryHierarchy' || key === 'inventory.storageTemperatureOptions') {
    const settings = await getRestaurantSettings();
    const settingKey = key === 'inventory.categoryHierarchy'
      ? 'CATEGORY_HIERARCHY'
      : 'STORAGE_TEMPERATURE_OPTIONS';
    return settings.find((setting) => setting.key === settingKey)?.value;
  }

  return restaurantMemory.get(key);
}
