import type {
  Adjustment,
  InventoryItem,
  Location,
  ProductReceived,
  PurchaseOrder,
  Transfer,
  User,
} from '../../app/utils/generateSampleData';
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
import { useQuery } from '@tanstack/react-query';
import {
  activateBundle,
  approveBundle,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  cancelTransfer,
  completeTransfer,
  createBundle,
  createInventoryItem,
  createLocation,
  createPurchaseOrder,
  createSale,
  createStockMovement,
  createSupplier,
  createTransfer,
  createUser,
  deactivateBundle,
  deleteBundle,
  deleteInventoryItem,
  deleteLocation,
  deleteUser,
  dispatchTransfer,
  getPurchaseOrder,
  receivePurchaseOrder,
  refundSale,
  rejectBundle,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  updateBundle,
  updateInventoryItem,
  updateLocation,
  updateUser,
} from '../../app/api/client';
import {
  domainQueryKeys,
  useDomainMutation,
  useBundlesQuery,
  useGoodsReceiptsQuery,
  useInventoryQuery,
  useLocationsQuery,
  usePurchaseOrdersQuery,
  useSalesQuery,
  useStockMovementsQuery,
  useSuppliersQuery,
  useTransfersQuery,
  useUsersQuery,
} from './domainQueries';

export const retailQueryKeys = {
  ...domainQueryKeys,
};

type RetailQueryKey = (typeof retailQueryKeys)[keyof typeof retailQueryKeys];

export function useRetailMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys: RetailQueryKey[],
) {
  return useDomainMutation(mutationFn, invalidateKeys);
}

export interface RetailStockAlert {
  id: string;
  itemName: string;
  currentStock: number;
  threshold: number;
  severity: 'low' | 'critical';
}

export type RetailInventoryItem = InventoryItem & { locationId?: string };
export type RetailBundleRecord = RetailApiBundle;
export type RetailSaleRecord = RetailApiSale;
export type RetailSupplierRecord = RetailApiSupplier;

export const formatDate = (value?: string | null) =>
  value ? new Date(value).toISOString().split('T')[0] : '';

export const getRetailErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const mapRetailLocation = (location: RetailApiLocation): Location => ({
  id: location.id,
  name: location.name,
  address: location.address,
  manager: location.manager,
  phone: location.phone,
  itemCount: location.itemCount ?? location._count?.items ?? 0,
});

export const mapRetailInventory = (
  item: RetailApiInventoryItem,
): RetailInventoryItem => ({
  id: item.id,
  name: item.name,
  category: item.category,
  targetCustomer: item.targetCustomer ?? 'Unisex',
  subcategory: item.subcategory ?? 'General',
  size: item.size ?? 'N/A',
  condition: item.condition ?? 'Good',
  quantity: item.quantity,
  price: item.price,
  dateAdded: formatDate(item.dateAdded),
  location: item.location?.name ?? 'Unknown Location',
  locationId: item.locationId,
});

export const mapRetailUser = (user: RetailApiUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  lastLogin: formatDate(user.lastLogin),
});

export const mapRetailPurchaseOrder = (order: RetailApiPurchaseOrder): PurchaseOrder => ({
  id: order.id,
  orderNumber: order.orderNumber,
  supplier: order.supplier?.name ?? 'Unassigned supplier',
  date: formatDate(order.createdAt),
  status:
    ({
      DRAFT: 'Pending',
      SUBMITTED: 'Pending',
      APPROVED: 'Approved',
      PARTIALLY_RECEIVED: 'Approved',
      RECEIVED: 'Received',
      REJECTED: 'Rejected',
      CANCELLED: 'Cancelled',
    } as Record<string, PurchaseOrder['status']>)[order.status] ?? 'Pending',
  items: order.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.unitPrice,
  })),
  totalAmount: order.totalAmount ?? 0,
  paymentMethod: order.paymentMethod ?? undefined,
  paymentTerms: order.paymentTerms ?? undefined,
  createdBy: order.createdBy?.name ?? order.createdBy?.email ?? '',
});

export const mapRetailTransfer = (transfer: RetailApiTransfer): Transfer => ({
  id: transfer.id,
  transferNumber: transfer.transferNumber,
  fromLocation: transfer.fromLocation?.name ?? '',
  toLocation: transfer.toLocation?.name ?? '',
  date: formatDate(transfer.createdAt),
  status:
    ({
      PENDING: 'Pending',
      IN_TRANSIT: 'In Transit',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    } as Record<string, Transfer['status']>)[transfer.status] ?? 'Pending',
  items: transfer.items.map((item) => ({
    itemId: item.inventoryItemId,
    name: item.inventoryItem?.name ?? 'Item',
    quantity: item.quantity,
  })),
  createdBy: transfer.createdBy?.name ?? transfer.createdBy?.email ?? '',
  notes: transfer.notes ?? undefined,
});

export const mapRetailAdjustment = (movement: RetailApiStockMovement): Adjustment => ({
  id: movement.id,
  adjustmentNumber: movement.referenceId ?? movement.id,
  date: formatDate(movement.createdAt),
  type: movement.newQuantity >= movement.previousQuantity ? 'Add' : 'Remove',
  reason: movement.reason ?? movement.notes ?? 'Inventory adjustment',
  items: [
    {
      itemId: movement.itemId,
      name: movement.item?.name ?? 'Item',
      quantityChange: (movement.newQuantity ?? 0) - (movement.previousQuantity ?? 0),
      location: movement.location?.name ?? '',
    },
  ],
  createdBy: movement.createdBy?.name ?? movement.createdBy?.email ?? '',
  status: 'Approved',
});

export const mapRetailGoodsReceipt = (receipt: RetailApiGoodsReceipt): ProductReceived => {
  const items = receipt.items.map((item) => ({
    name: item.purchaseOrderItem?.name ?? item.inventoryItem?.name ?? 'Item',
    orderedQty: item.purchaseOrderItem?.quantity ?? item.receivedQty + item.rejectedQty,
    receivedQty: item.receivedQty + item.rejectedQty,
    acceptedQty: item.receivedQty,
    rejectedQty: item.rejectedQty,
    category: item.inventoryItem?.category ?? 'Uncategorized',
    condition: item.condition ?? 'Good',
    inspectionNotes: item.notes ?? undefined,
    price: item.purchaseOrderItem?.unitPrice ?? 0,
  }));
  const totalAccepted = items.reduce((sum, item) => sum + item.acceptedQty, 0);
  const totalRejected = items.reduce((sum, item) => sum + item.rejectedQty, 0);

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    poNumber: receipt.purchaseOrder?.orderNumber ?? '',
    poId: receipt.purchaseOrderId,
    supplier: receipt.purchaseOrder?.supplier?.name ?? '',
    dateReceived: formatDate(receipt.createdAt),
    receivedDate: formatDate(receipt.createdAt),
    items,
    receivedBy: receipt.receivedBy?.name ?? receipt.receivedBy?.email ?? '',
    status: totalRejected > 0 ? 'Partially Accepted' : 'Fully Accepted',
    totalOrdered: totalAccepted + totalRejected,
    totalAccepted,
    totalRejected,
  };
};

export type RetailInventoryRecord = RetailApiInventoryItem & { locationId: string };
export type RetailPurchaseOrderRecord = RetailApiPurchaseOrder & {
  supplier: RetailApiSupplier | null;
  items: RetailApiPurchaseOrder['items'];
};
export type RetailTransferRecord = RetailApiTransfer & {
  fromLocation: RetailApiLocation | null;
  toLocation: RetailApiLocation | null;
  items: RetailApiTransfer['items'];
};

export const mapRetailInventoryRecord = (
  item: RetailApiInventoryItem,
): RetailInventoryRecord => ({
  ...item,
  locationId: item.locationId ?? item.location?.id ?? '',
});

export const mapRetailPurchaseOrderRecord = (
  order: RetailApiPurchaseOrder,
): RetailPurchaseOrderRecord => ({
  ...order,
  items: order.items,
  supplier: order.supplier ?? null,
});

export const mapRetailTransferRecord = (
  transfer: RetailApiTransfer,
): RetailTransferRecord => ({
  ...transfer,
  items: transfer.items,
  fromLocation: transfer.fromLocation ?? null,
  toLocation: transfer.toLocation ?? null,
});

export const mapRetailBundleRecord = (bundle: RetailApiBundle): RetailApiBundle => ({
  ...bundle,
  items: bundle.items,
});

export const mapRetailSupplierRecord = (
  supplier: RetailApiSupplier,
): RetailApiSupplier => supplier;

export const mapRetailSaleRecord = (sale: RetailApiSale): RetailApiSale => ({
  ...sale,
  items: sale.items,
});

function mapItems<TItem, TMapped, TData = TMapped[]>(
  items: TItem[],
  mapper: (item: TItem) => TMapped,
  select?: (items: TMapped[]) => TData,
) {
  const mapped = items.map(mapper);
  return select ? select(mapped) : (mapped as unknown as TData);
}

export function useRetailInventoryQuery<TData = ReturnType<typeof mapRetailInventory>[]>(
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailInventory>[]) => TData,
) {
  return useInventoryQuery(
    { itemType: 'RETAIL_ITEM' },
    { enabled, select: (items) => mapItems(items, mapRetailInventory, select) },
  );
}

export function useRetailInventoryRecordsQuery<
  TData = ReturnType<typeof mapRetailInventoryRecord>[],
>(
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailInventoryRecord>[]) => TData,
) {
  return useInventoryQuery(
    { itemType: 'RETAIL_ITEM' },
    { enabled, select: (items) => mapItems(items, mapRetailInventoryRecord, select) },
  );
}

export function useRetailLocationsQuery<TData = ReturnType<typeof mapRetailLocation>[]>(
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailLocation>[]) => TData,
) {
  return useLocationsQuery({
    enabled,
    select: (items) => mapItems(items, mapRetailLocation, select),
  });
}

export function useRetailUsersQuery<TData = ReturnType<typeof mapRetailUser>[]>(
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailUser>[]) => TData,
) {
  return useUsersQuery({
    enabled,
    select: (items) => mapItems(items, mapRetailUser, select),
  });
}

export function useRetailPurchaseOrdersQuery<
  TData = ReturnType<typeof mapRetailPurchaseOrder>[],
>(
  params?: { status?: string; supplierId?: string },
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailPurchaseOrder>[]) => TData,
) {
  return usePurchaseOrdersQuery(params, {
    enabled,
    select: (items) => mapItems(items, mapRetailPurchaseOrder, select),
  });
}

export function useRetailPurchaseOrderRecordsQuery<
  TData = ReturnType<typeof mapRetailPurchaseOrderRecord>[],
>(
  params?: { status?: string; supplierId?: string },
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailPurchaseOrderRecord>[]) => TData,
) {
  return usePurchaseOrdersQuery(params, {
    enabled,
    select: (items) => mapItems(items, mapRetailPurchaseOrderRecord, select),
  });
}

export function useRetailPurchaseOrderDetailQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: [...domainQueryKeys.purchaseOrders, 'detail', id],
    queryFn: () => getPurchaseOrder(id as string).then(mapRetailPurchaseOrderRecord),
    enabled: enabled && Boolean(id),
  });
}

export function useRetailGoodsReceiptsQuery<
  TData = ReturnType<typeof mapRetailGoodsReceipt>[],
>(
  params?: { purchaseOrderId?: string },
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailGoodsReceipt>[]) => TData,
) {
  return useGoodsReceiptsQuery(params, {
    enabled,
    select: (items) => mapItems(items, mapRetailGoodsReceipt, select),
  });
}

export function useRetailTransfersQuery<TData = ReturnType<typeof mapRetailTransfer>[]>(
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailTransfer>[]) => TData,
) {
  return useTransfersQuery(undefined, {
    enabled,
    select: (items) => mapItems(items, mapRetailTransfer, select),
  });
}

export function useRetailTransferRecordsQuery<
  TData = ReturnType<typeof mapRetailTransferRecord>[],
>(
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailTransferRecord>[]) => TData,
) {
  return useTransfersQuery(undefined, {
    enabled,
    select: (items) => mapItems(items, mapRetailTransferRecord, select),
  });
}

export function useRetailAdjustmentsQuery<
  TData = ReturnType<typeof mapRetailAdjustment>[],
>(
  enabled = true,
  select?: (items: ReturnType<typeof mapRetailAdjustment>[]) => TData,
) {
  return useStockMovementsQuery(
    { type: 'ADJUSTMENT' },
    {
      enabled,
      select: (items) => mapItems(items, mapRetailAdjustment, select),
    },
  );
}

export function useRetailBundlesQuery<TData = RetailApiBundle[]>(
  params?: { status?: string },
  select?: (items: RetailApiBundle[]) => TData,
) {
  return useBundlesQuery(params, {
    select: (items) => mapItems(items, mapRetailBundleRecord, select),
  });
}

export function useRetailSuppliersQuery<TData = RetailApiSupplier[]>(
  params?: { isActive?: boolean },
  select?: (items: RetailApiSupplier[]) => TData,
) {
  return useSuppliersQuery(params, {
    select: (items) => mapItems(items, mapRetailSupplierRecord, select),
  });
}

export function useRetailSalesQuery<TData = RetailApiSale[]>(
  params?: { locationId?: string; status?: string; dateFrom?: string; dateTo?: string },
  select?: (items: RetailApiSale[]) => TData,
) {
  return useSalesQuery(params, {
    select: (items) => mapItems(items, mapRetailSaleRecord, select),
  });
}

export function useSaveRetailInventoryMutation() {
  return useRetailMutation(
    ({ id, data }: { id?: string; data: unknown }) =>
      id ? updateInventoryItem(id, data) : createInventoryItem(data),
    [retailQueryKeys.inventory],
  );
}

export function useDeleteRetailInventoryMutation() {
  return useRetailMutation(deleteInventoryItem, [retailQueryKeys.inventory]);
}

export function useCreateRetailLocationMutation() {
  return useRetailMutation(createLocation, [retailQueryKeys.locations]);
}

export function useUpdateRetailLocationMutation() {
  return useRetailMutation(
    ({ id, data }: { id: string; data: unknown }) => updateLocation(id, data),
    [retailQueryKeys.locations],
  );
}

export function useDeleteRetailLocationMutation() {
  return useRetailMutation(deleteLocation, [retailQueryKeys.locations]);
}

export function useCreateRetailUserMutation() {
  return useRetailMutation(createUser, [retailQueryKeys.users]);
}

export function useUpdateRetailUserMutation() {
  return useRetailMutation(
    ({ id, data }: { id: string; data: unknown }) => updateUser(id, data),
    [retailQueryKeys.users],
  );
}

export function useDeleteRetailUserMutation() {
  return useRetailMutation(deleteUser, [retailQueryKeys.users]);
}

export function useCreateRetailPurchaseOrderMutation() {
  return useRetailMutation(createPurchaseOrder, [retailQueryKeys.purchaseOrders]);
}

export function useSubmitRetailPurchaseOrderMutation() {
  return useRetailMutation(submitPurchaseOrder, [retailQueryKeys.purchaseOrders]);
}

export function useApproveRetailPurchaseOrderMutation() {
  return useRetailMutation(approvePurchaseOrder, [retailQueryKeys.purchaseOrders]);
}

export function useRejectRetailPurchaseOrderMutation() {
  return useRetailMutation(
    ({ id, reason }: { id: string; reason: string }) => rejectPurchaseOrder(id, reason),
    [retailQueryKeys.purchaseOrders],
  );
}

export function useCancelRetailPurchaseOrderMutation() {
  return useRetailMutation(cancelPurchaseOrder, [retailQueryKeys.purchaseOrders]);
}

export function useReceiveRetailPurchaseOrderMutation() {
  return useRetailMutation(
    ({
      id,
      items,
      notes,
    }: {
      id: string;
      items: {
        id: string;
        receivedQty: number;
        rejectedQty: number;
        condition?: string;
        notes?: string;
        expiryDate?: string;
        storageTemperature?: string;
      }[];
      notes?: string;
    }) => receivePurchaseOrder(id, items, notes),
    [
      retailQueryKeys.purchaseOrders,
      retailQueryKeys.inventory,
      retailQueryKeys.goodsReceipts,
    ],
  );
}

export function useCreateRetailSupplierMutation() {
  return useRetailMutation(createSupplier, [retailQueryKeys.suppliers]);
}

export function useCreateRetailTransferMutation() {
  return useRetailMutation(createTransfer, [
    retailQueryKeys.transfers,
    retailQueryKeys.inventory,
  ]);
}

export function useDispatchRetailTransferMutation() {
  return useRetailMutation(dispatchTransfer, [retailQueryKeys.transfers]);
}

export function useCompleteRetailTransferMutation() {
  return useRetailMutation(completeTransfer, [
    retailQueryKeys.transfers,
    retailQueryKeys.inventory,
  ]);
}

export function useCancelRetailTransferMutation() {
  return useRetailMutation(cancelTransfer, [retailQueryKeys.transfers]);
}

export function useCreateRetailAdjustmentMutation() {
  return useRetailMutation(createStockMovement, [
    retailQueryKeys.inventory,
    retailQueryKeys.stockMovements,
  ]);
}

export function useCreateRetailSaleMutation() {
  return useRetailMutation(createSale, [
    retailQueryKeys.inventory,
    retailQueryKeys.sales,
  ]);
}

export function useRefundRetailSaleMutation() {
  return useRetailMutation(
    ({ id, reason }: { id: string; reason: string }) => refundSale(id, reason),
    [retailQueryKeys.inventory, retailQueryKeys.sales],
  );
}

export function useCreateRetailBundleMutation() {
  return useRetailMutation(createBundle, [retailQueryKeys.bundles]);
}

export function useUpdateRetailBundleMutation() {
  return useRetailMutation(
    ({ id, data }: { id: string; data: unknown }) => updateBundle(id, data),
    [retailQueryKeys.bundles],
  );
}

export function useApproveRetailBundleMutation() {
  return useRetailMutation(approveBundle, [retailQueryKeys.bundles]);
}

export function useRejectRetailBundleMutation() {
  return useRetailMutation(
    ({ id, reason }: { id: string; reason: string }) => rejectBundle(id, reason),
    [retailQueryKeys.bundles],
  );
}

export function useActivateRetailBundleMutation() {
  return useRetailMutation(activateBundle, [retailQueryKeys.bundles]);
}

export function useDeactivateRetailBundleMutation() {
  return useRetailMutation(deactivateBundle, [retailQueryKeys.bundles]);
}

export function useDeleteRetailBundleMutation() {
  return useRetailMutation(deleteBundle, [
    retailQueryKeys.bundles,
    retailQueryKeys.inventory,
  ]);
}
