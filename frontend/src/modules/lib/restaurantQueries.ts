import { useQuery } from '@tanstack/react-query';
import {
  getGoodsReceipts,
  getInventory,
  getPurchaseOrders,
  getStockMovements,
  getSuppliers,
  getTransfers,
  getUsers,
} from '../../app/api/client';
import {
  domainQueryKeys,
  useGoodsReceiptsQuery,
  useKitchenOrdersQuery,
  usePurchaseOrdersQuery,
  useRecipesQuery,
  useStockMovementsQuery,
  useSuppliersQuery,
  useTransfersQuery,
  useUsersQuery,
} from './domainQueries';

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

export function mapRestaurantInventory(items: any[]) {
  return items.map((item: any, index: number) => ({
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

export function mapRestaurantPurchaseOrders(orders: any[]) {
  return orders.map((order: any) => ({
    id: order.id,
    backendId: order.id,
    supplier: order.supplier?.name ?? '',
    supplierId: order.supplierId,
    date: toDateInput(order.createdAt),
    items: order.items?.length ?? 0,
    orderItems: (order.items ?? []).map((item: any) => ({
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

export function mapRestaurantSuppliers(suppliers: any[]) {
  return suppliers.map((supplier: any) => ({
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

export function mapRestaurantUsers(users: any[]) {
  return users.map((user: any, index: number) => ({
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

export function mapRestaurantTransfers(transfers: any[]) {
  return transfers.map((transfer: any) => ({
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

export function mapRestaurantAdjustments(movements: any[]) {
  return movements.filter((item: any) => item.type === 'ADJUSTMENT').map((item: any) => ({
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

export function mapRestaurantWaste(movements: any[]) {
  return movements.filter((item: any) => ['SPOILAGE', 'EXPIRY'].includes(item.type)).map((item: any) => ({
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
  return usePurchaseOrdersQuery(undefined, {
    select: (orders) => {
      const mapped = mapRestaurantPurchaseOrders(orders);
      return select ? select(mapped) : mapped as TData;
    },
  });
}

export function useRestaurantSuppliersQuery() {
  return useSuppliersQuery(undefined, { select: mapRestaurantSuppliers });
}

export function useRestaurantUsersQuery(enabled = true) {
  return useUsersQuery({ enabled, select: mapRestaurantUsers });
}

export function useRestaurantTransfersQuery() {
  return useTransfersQuery(undefined, { select: mapRestaurantTransfers });
}

export function useRestaurantAdjustmentsQuery() {
  return useStockMovementsQuery(undefined, { select: mapRestaurantAdjustments });
}

export function useRestaurantWasteQuery() {
  return useStockMovementsQuery(undefined, { select: mapRestaurantWaste });
}

export function useRestaurantRecipesQuery() {
  return useRecipesQuery(undefined, {
    select: (recipes) => recipes.map((recipe: any) => {
      const ingredients = (recipe.ingredients ?? []).map((ingredient: any) => ({
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
        (sum: number, ingredient: any) => sum + ingredient.totalCost,
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
    select: (orders) => orders.map((order: any) => ({
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

export function useRestaurantGoodsReceiptsQuery<TData = any[]>(
  select?: (receipts: any[]) => TData,
) {
  return useGoodsReceiptsQuery(undefined, { select: select ?? ((receipts) => receipts as TData) });
}

export function useRestaurantGoodsRecordsQuery() {
  return useQuery({
    queryKey: [...domainQueryKeys.goodsReceipts, { module: 'RESTAURANT', includePending: true }],
    queryFn: async () => {
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
          (sum: number, line: any) =>
            sum + line.receivedQty * (line.purchaseOrderItem?.unitPrice ?? 0),
          0,
        ),
        receivedBy: receipt.receivedBy?.name ?? receipt.receivedBy?.email ?? '',
        status: (receipt.items ?? []).some((line: any) => line.rejectedQty > 0)
          ? 'partial'
          : 'verified',
        notes: receipt.notes ?? '',
      }));
      const pending = orders
        .filter(
          (order: any) =>
            ['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status) &&
            (order.items ?? []).some(
              (item: any) => item.receivedQty + item.rejectedQty < item.quantity,
            ),
        )
        .map((order: any) => ({
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
    },
  });
}

// Keep direct API exports out of screen components while migration is in progress.
export const restaurantQueryLoaders = {
  inventory: getRestaurantInventory,
  purchaseOrders: getPurchaseOrders,
  goodsReceipts: getGoodsReceipts,
  suppliers: getSuppliers,
  transfers: getTransfers,
  stockMovements: getStockMovements,
  users: getUsers,
};
