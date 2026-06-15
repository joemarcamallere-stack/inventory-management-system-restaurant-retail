import { useQuery } from '@tanstack/react-query';
import type {
  ApiGoodsReceipt,
  ApiInventoryItem,
  ApiKitchenOrder,
  ApiPurchaseOrder,
  ApiRecipe,
  ApiStockMovement,
  ApiSupplier,
  ApiTransfer,
  ApiUser,
} from '../../../app/api/domainTypes';
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  cancelTransfer,
  completeKitchenOrder,
  completeTransfer,
  createInventoryItem,
  createPurchaseOrder,
  createRecipe,
  createStockMovement,
  createSupplier,
  createTransfer,
  deleteInventoryItem,
  deleteRecipe,
  dispatchTransfer,
  getGoodsReceipts,
  getInventory,
  getPurchaseOrders,
  getSales,
  getStockMovements,
  getSuppliers,
  getTransfers,
  getUsers,
  receivePurchaseOrder,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  updateInventoryItem,
  updatePurchaseOrder,
  updateRecipe,
  upsertRestaurantSetting,
  voidKitchenOrder,
} from '../../../app/api/client';
import {
  domainQueryKeys,
  useDomainMutation,
  useGoodsReceiptsQuery,
  useKitchenOrdersQuery,
  useLocationsQuery,
  usePurchaseOrdersQuery,
  useRecipesQuery,
  useStockMovementsQuery,
  useSuppliersQuery,
  useTransfersQuery,
  useUsersQuery,
  useRestaurantSettingsQuery,
  useSalesQuery,
} from '../domainQueries';

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

async function getRestaurantInventory() {
  const groups = await Promise.all([
    getInventory({ itemType: 'INGREDIENT' }),
    getInventory({ itemType: 'MENU_ITEM' }),
    getInventory({ itemType: 'SUPPLY' }),
  ]);
  return groups.flat();
}

export function mapRestaurantInventory(items: ApiInventoryItem[]) {
  return items.map((item, index) => ({
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
  }));
}

export function mapRestaurantPurchaseOrders(orders: ApiPurchaseOrder[]) {
  return orders.map((order) => ({
    id: order.id,
    backendId: order.id,
    supplier: order.supplier?.name ?? '',
    supplierId: order.supplierId,
    date: toDateInput(order.createdAt),
    items: order.items?.length ?? 0,
    orderItems: (order.items ?? []).map((item) => ({
      backendId: item.id,
      productId: item.inventoryItemId,
      backendInventoryId: item.inventoryItemId,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      category: item.inventoryItem?.category ?? '',
      subCategory: item.inventoryItem?.subcategory ?? '',
      unit: item.inventoryItem?.unit ?? 'pcs',
    })),
    total: order.totalAmount,
    status: ({
      DRAFT: 'draft',
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
}

export function mapRestaurantSuppliers(suppliers: ApiSupplier[]) {
  return suppliers.map((supplier) => ({
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

export function mapRestaurantUsers(users: ApiUser[]) {
  return users.map((user, index) => ({
    id: index + 1,
    backendId: user.id,
    name: user.name,
    email: user.email,
    phone: '',
    role: user.role.toLowerCase(),
    status: user.status.toLowerCase(),
    lastLogin: user.lastLogin,
    avatar: user.name.split(' ').map((part: string) => part[0]).join('').slice(0, 2),
  }));
}

export function mapRestaurantTransfers(transfers: ApiTransfer[]) {
  return transfers.map((transfer) => ({
    id: transfer.id,
    backendId: transfer.id,
    item: transfer.items?.[0]?.inventoryItem?.name ?? 'Multiple items',
    quantity: transfer.items?.[0]?.quantity ?? 0,
    unit: transfer.items?.[0]?.inventoryItem?.unit ?? 'pcs',
    from: transfer.fromLocation?.name ?? '',
    to: transfer.toLocation?.name ?? '',
    requestedBy: transfer.createdBy?.name ?? '',
    requestDate: toDateInput(transfer.createdAt),
    status: transfer.status === 'IN_TRANSIT' ? 'in-transit' : transfer.status.toLowerCase(),
    completedDate: toDateInput(transfer.completedAt),
    notes: transfer.notes ?? '',
  }));
}

export function mapRestaurantAdjustments(movements: ApiStockMovement[]) {
  return movements.filter((item) => item.type === 'ADJUSTMENT').map((item) => ({
    id: item.id,
    item: item.item?.name ?? 'Item',
    quantity: item.newQuantity,
    unit: item.unit ?? item.item?.unit ?? 'pcs',
    location: item.location?.name ?? '',
    type: 'correction',
    reason: item.reason ?? '',
    adjustedBy: item.createdBy?.name ?? '',
    date: toDateInput(item.createdAt),
    notes: item.notes ?? '',
  }));
}

export function mapRestaurantWaste(movements: ApiStockMovement[]) {
  return movements.filter((item) => ['SPOILAGE', 'EXPIRY'].includes(item.type)).map((item) => ({
    id: item.id,
    item: item.item?.name ?? 'Item',
    quantity: item.quantity,
    unit: item.unit ?? item.item?.unit ?? 'pcs',
    location: item.location?.name ?? '',
    wasteType: item.type === 'EXPIRY' ? 'expiry' : 'spoilage',
    unitCost: item.item?.costPrice ?? item.item?.price ?? 0,
    totalValue: item.quantity * (item.item?.costPrice ?? item.item?.price ?? 0),
    date: toDateInput(item.createdAt),
    loggedBy: item.createdBy?.name ?? '',
    source: 'manual',
    notes: item.notes ?? item.reason ?? '',
  }));
}

export function useRestaurantInventoryQuery<TData = ReturnType<typeof mapRestaurantInventory>>(
  select?: (items: ReturnType<typeof mapRestaurantInventory>) => TData,
) {
  return useQuery({
    queryKey: [...domainQueryKeys.inventory, { module: 'RESTAURANT' }],
    queryFn: getRestaurantInventory,
    select: (items) => {
      const mapped = mapRestaurantInventory(items);
      return select ? select(mapped) : mapped as TData;
    },
  });
}

export function useRestaurantPurchaseOrdersQuery<TData = ReturnType<typeof mapRestaurantPurchaseOrders>>(
  select?: (orders: ReturnType<typeof mapRestaurantPurchaseOrders>) => TData,
) {
  return usePurchaseOrdersQuery({ module: 'RESTAURANT' }, {
    select: (orders) => {
      const mapped = mapRestaurantPurchaseOrders(orders);
      return select ? select(mapped) : mapped as TData;
    },
  });
}

export function useRestaurantSuppliersQuery() {
  return useSuppliersQuery(
    { module: 'RESTAURANT' },
    { select: mapRestaurantSuppliers },
  );
}

export function useRestaurantUsersQuery(enabled = true) {
  return useUsersQuery({ enabled, select: mapRestaurantUsers });
}

export function useRestaurantTransfersQuery() {
  return useTransfersQuery(
    { module: 'RESTAURANT' },
    { select: mapRestaurantTransfers },
  );
}

export function useRestaurantAdjustmentsQuery() {
  return useStockMovementsQuery(
    { module: 'RESTAURANT' },
    { select: mapRestaurantAdjustments },
  );
}

export function useRestaurantWasteQuery() {
  return useStockMovementsQuery(
    { module: 'RESTAURANT' },
    { select: mapRestaurantWaste },
  );
}

export function useRestaurantRecipesQuery() {
  return useRecipesQuery(undefined, {
    select: (recipes) => recipes.map((recipe: ApiRecipe) => {
      const ingredients = (recipe.ingredients ?? []).map((ingredient) => ({
        id: ingredient.id,
        productId: ingredient.itemId,
        backendItemId: ingredient.itemId,
        productSku: ingredient.item?.sku,
        name: ingredient.item?.name ?? 'Ingredient',
        quantity: ingredient.quantity,
        unit: ingredient.unit ?? ingredient.item?.unit ?? 'pcs',
        inventoryQuantity: ingredient.quantity,
        inventoryUnit: ingredient.item?.unit ?? ingredient.unit ?? 'pcs',
        unitCost: ingredient.unitCost ?? ingredient.item?.price ?? 0,
        totalCost: (ingredient.unitCost ?? ingredient.item?.price ?? 0) * ingredient.quantity,
      }));
      const totalCost = ingredients.reduce(
        (sum, ingredient) => sum + ingredient.totalCost,
        0,
      );
      return {
        id: recipe.id,
        backendId: recipe.id,
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
    }),
  });
}

export function useRestaurantKitchenOrdersQuery() {
  return useKitchenOrdersQuery(undefined, {
    select: (orders) => orders.map((order: ApiKitchenOrder) => ({
      id: order.id,
      receiptNo: order.receiptNo,
      recipeId: order.recipeId,
      recipeName: order.recipe?.name ?? 'Recipe',
      quantity: order.quantity,
      status: order.status.toLowerCase(),
      orderedAt: order.createdAt,
      completedBy: order.completedBy?.email ?? 'shared-backend',
      notes: order.notes ?? '',
      voidReason: order.voidReason,
      voidedAt: order.voidedAt,
    })),
  });
}

export function useRestaurantGoodsReceiptsQuery<TData = ApiGoodsReceipt[]>(
  select?: (receipts: ApiGoodsReceipt[]) => TData,
) {
  return useGoodsReceiptsQuery(
    { module: 'RESTAURANT' },
    { select: select ?? ((receipts) => receipts as TData) },
  );
}

export function useRestaurantGoodsRecordsQuery() {
  return useQuery({
    queryKey: [...domainQueryKeys.goodsReceipts, { module: 'RESTAURANT', includePending: true }],
    queryFn: async () => {
      const [receipts, orders] = await Promise.all([
        getGoodsReceipts({ module: 'RESTAURANT' }),
        getPurchaseOrders({ module: 'RESTAURANT' }),
      ]);
      const received = receipts.map((receipt) => ({
        id: receipt.receiptNumber,
        backendId: receipt.id,
        poId: receipt.purchaseOrderId,
        supplier: receipt.purchaseOrder?.supplier?.name ?? '',
        receivedDate: toDateInput(receipt.createdAt),
        items: receipt.items?.length ?? 0,
        receivedItems: (receipt.items ?? []).map((line) => ({
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
          (sum, line) =>
            sum + line.receivedQty * (line.purchaseOrderItem?.unitPrice ?? 0),
          0,
        ),
        receivedBy: receipt.receivedBy?.name ?? receipt.receivedBy?.email ?? '',
        status: (receipt.items ?? []).some((line) => line.rejectedQty > 0)
          ? 'partial'
          : 'verified',
        notes: receipt.notes ?? '',
      }));
      const pending = orders
        .filter(
          (order) =>
            ['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status) &&
            (order.items ?? []).some(
              (item) => item.receivedQty + item.rejectedQty < item.quantity,
            ),
        )
        .map((order) => ({
          id: `GR-${order.orderNumber}`,
          poId: order.id,
          supplier: order.supplier?.name ?? '',
          receivedDate: toDateInput(order.expectedDelivery ?? order.createdAt),
          items: order.items?.length ?? 0,
          receivedItems: (order.items ?? []).map((item) => ({
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
    },
  });
}

// Keep direct API exports out of screen components while migration is in progress.
export const restaurantQueryLoaders = {
  inventory: getRestaurantInventory,
  purchaseOrders: () => getPurchaseOrders({ module: 'RESTAURANT' }),
  goodsReceipts: () => getGoodsReceipts({ module: 'RESTAURANT' }),
  suppliers: () => getSuppliers({ module: 'RESTAURANT' }),
  transfers: () => getTransfers({ module: 'RESTAURANT' }),
  stockMovements: () => getStockMovements({ module: 'RESTAURANT' }),
  users: getUsers,
};

export function useRestaurantLocationsQuery() {
  return useLocationsQuery();
}

export function useRestaurantStockMovementsQuery<TData = ApiStockMovement[]>(
  select?: (items: ApiStockMovement[]) => TData,
) {
  return useStockMovementsQuery(
    { module: 'RESTAURANT' },
    select ? { select } : undefined,
  );
}

export function useRestaurantSettings() {
  return useRestaurantSettingsQuery();
}

export function useRestaurantSalesQuery<
  TData = Awaited<ReturnType<typeof getSales>>,
>(
  select?: (items: Awaited<ReturnType<typeof getSales>>) => TData,
) {
  return useSalesQuery(
    { module: 'RESTAURANT' },
    select ? { select } : undefined,
  );
}

export function useCreateRestaurantInventoryMutation() {
  return useDomainMutation(
    (data: Record<string, unknown>) => createInventoryItem(data),
    [domainQueryKeys.inventory, domainQueryKeys.stockMovements],
  );
}

export function useUpdateRestaurantInventoryMutation() {
  return useDomainMutation(
    ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateInventoryItem(id, data),
    [domainQueryKeys.inventory, domainQueryKeys.purchaseOrders, domainQueryKeys.transfers],
  );
}

export function useDeleteRestaurantInventoryMutation() {
  return useDomainMutation(deleteInventoryItem, [
    domainQueryKeys.inventory,
    domainQueryKeys.purchaseOrders,
    domainQueryKeys.transfers,
  ]);
}

export function useCreateRestaurantPurchaseOrderMutation() {
  return useDomainMutation(
    (data: Record<string, unknown>) =>
      createPurchaseOrder({ ...data, module: 'RESTAURANT' }),
    [domainQueryKeys.purchaseOrders, domainQueryKeys.suppliers],
  );
}

type SaveRestaurantPurchaseOrderLine = {
  productId?: string;
  inventoryId?: string | number;
  sku?: string;
  productName: string;
  category?: string;
  subCategory?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
};

type RestaurantPurchaseOrderProduct = {
  id: string;
  backendId?: string;
  inventoryId?: string | number;
};

export function useSaveRestaurantPurchaseOrderMutation() {
  const locationsQuery = useLocationsQuery();

  return useDomainMutation(
    async ({
      editingId,
      supplierId,
      expectedDelivery,
      items,
      products,
    }: {
      editingId?: string;
      supplierId: string;
      expectedDelivery?: string;
      items: SaveRestaurantPurchaseOrderLine[];
      products: RestaurantPurchaseOrderProduct[];
    }) => {
      const location = locationsQuery.data?.[0];
      if (!location) {
        throw new Error('Create a location before ordering a new product');
      }

      const apiItems = [];
      for (const line of items) {
        const product = products.find(
          (item) =>
            item.id === line.productId ||
            item.inventoryId === line.inventoryId,
        );
        let inventoryItemId =
          product?.backendId ??
          (product?.id &&
          !product.id.startsWith('gp-') &&
          !product.id.startsWith('inv-')
            ? product.id
            : undefined);

        if (!inventoryItemId) {
          const created = await createInventoryItem({
            name: line.productName,
            itemType: 'INGREDIENT',
            sku: line.sku || undefined,
            category: `${line.category || 'Other'} > ${line.subCategory || 'General'}`,
            quantity: 0,
            price: line.unitPrice,
            unit: line.unit || 'pcs',
            minStock: 0,
            maxStock: 0,
            reorderPoint: 0,
            locationId: location.id,
          });
          inventoryItemId = created.id;
        }

        apiItems.push({
          inventoryItemId,
          name: line.productName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        });
      }

      const payload = {
        supplierId,
        expectedDelivery: expectedDelivery
          ? new Date(`${expectedDelivery}T00:00:00`).toISOString()
          : undefined,
        items: apiItems,
        module: 'RESTAURANT',
      };

      if (editingId) {
        return updatePurchaseOrder(editingId, payload, 'RESTAURANT');
      }
      const created = await createPurchaseOrder(payload);
      return submitPurchaseOrder(created.id, 'RESTAURANT');
    },
    [domainQueryKeys.purchaseOrders, domainQueryKeys.inventory],
  );
}

export function useUpdateRestaurantPurchaseOrderMutation() {
  return useDomainMutation(
    ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updatePurchaseOrder(id, data, 'RESTAURANT'),
    [domainQueryKeys.purchaseOrders],
  );
}

export function useSubmitRestaurantPurchaseOrderMutation() {
  return useDomainMutation(
    (id: string) => submitPurchaseOrder(id, 'RESTAURANT'),
    [domainQueryKeys.purchaseOrders],
  );
}

export function useApproveRestaurantPurchaseOrderMutation() {
  return useDomainMutation(
    (id: string) => approvePurchaseOrder(id, 'RESTAURANT'),
    [domainQueryKeys.purchaseOrders, domainQueryKeys.goodsReceipts],
  );
}

export function useRejectRestaurantPurchaseOrderMutation() {
  return useDomainMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      rejectPurchaseOrder(id, reason, 'RESTAURANT'),
    [domainQueryKeys.purchaseOrders],
  );
}

export function useCancelRestaurantPurchaseOrderMutation() {
  return useDomainMutation(
    (id: string) => cancelPurchaseOrder(id, 'RESTAURANT'),
    [domainQueryKeys.purchaseOrders],
  );
}

export function useReceiveRestaurantPurchaseOrderMutation() {
  return useDomainMutation(
    ({
      id,
      items,
      notes,
    }: {
      id: string;
      items: Parameters<typeof receivePurchaseOrder>[1];
      notes?: string;
    }) => receivePurchaseOrder(id, items, notes, 'RESTAURANT'),
    [
      domainQueryKeys.purchaseOrders,
      domainQueryKeys.goodsReceipts,
      domainQueryKeys.inventory,
      domainQueryKeys.stockMovements,
    ],
  );
}

export function useCreateRestaurantSupplierMutation() {
  return useDomainMutation(
    (data: Record<string, unknown>) =>
      createSupplier({ ...data, module: 'RESTAURANT' }),
    [domainQueryKeys.suppliers, domainQueryKeys.purchaseOrders],
  );
}

export function useCreateRestaurantTransferMutation() {
  return useDomainMutation(
    (data: Record<string, unknown>) =>
      createTransfer({ ...data, module: 'RESTAURANT' }),
    [domainQueryKeys.transfers, domainQueryKeys.inventory, domainQueryKeys.stockMovements],
  );
}

export function useRestaurantTransferActionMutation() {
  return useDomainMutation(
    ({ id, action }: { id: string; action: 'dispatch' | 'complete' | 'cancel' }) => {
      if (action === 'dispatch') return dispatchTransfer(id, 'RESTAURANT');
      if (action === 'complete') return completeTransfer(id, 'RESTAURANT');
      return cancelTransfer(id, 'RESTAURANT');
    },
    [domainQueryKeys.transfers, domainQueryKeys.inventory, domainQueryKeys.stockMovements],
  );
}

export function useCreateRestaurantStockMovementMutation() {
  return useDomainMutation(
    (data: Record<string, unknown>) =>
      createStockMovement({ ...data, module: 'RESTAURANT' }),
    [domainQueryKeys.stockMovements, domainQueryKeys.inventory],
  );
}

export function useCreateRestaurantRecipeMutation() {
  return useDomainMutation(createRecipe, [domainQueryKeys.recipes]);
}

export function useUpdateRestaurantRecipeMutation() {
  return useDomainMutation(
    ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateRecipe(id, data),
    [domainQueryKeys.recipes],
  );
}

export function useDeleteRestaurantRecipeMutation() {
  return useDomainMutation(deleteRecipe, [domainQueryKeys.recipes]);
}

export function useCompleteRestaurantKitchenOrderMutation() {
  return useDomainMutation(completeKitchenOrder, [
    domainQueryKeys.kitchenOrders,
    domainQueryKeys.inventory,
  ]);
}

export function useVoidRestaurantKitchenOrderMutation() {
  return useDomainMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      voidKitchenOrder(id, reason),
    [domainQueryKeys.kitchenOrders, domainQueryKeys.inventory, domainQueryKeys.stockMovements],
  );
}

export function useSaveRestaurantRecipeMutation() {
  return useDomainMutation(
    ({ id, data }: { id?: string; data: Record<string, unknown> }) =>
      id ? updateRecipe(id, data) : createRecipe(data),
    [domainQueryKeys.recipes],
  );
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
