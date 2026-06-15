import { useQuery } from '@tanstack/react-query';
import type {
  ApiGoodsReceipt,
  ApiPurchaseOrder,
  ApiSupplier,
} from '../../../app/api/domainTypes';
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createInventoryItem,
  createPurchaseOrder,
  createSupplier,
  getGoodsReceipts,
  getPurchaseOrders,
  receivePurchaseOrder,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from '../../../app/api/client';
import {
  domainQueryKeys,
  useDomainMutation,
  useGoodsReceiptsQuery,
  useLocationsQuery,
  usePurchaseOrdersQuery,
  useSuppliersQuery,
} from '../domainQueries';

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

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
    status:
      ({
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

export function useRestaurantPurchaseOrdersQuery<
  TData = ReturnType<typeof mapRestaurantPurchaseOrders>,
>(select?: (orders: ReturnType<typeof mapRestaurantPurchaseOrders>) => TData) {
  return usePurchaseOrdersQuery(
    { module: 'RESTAURANT' },
    {
      select: (orders) => {
        const mapped = mapRestaurantPurchaseOrders(orders);
        return select ? select(mapped) : (mapped as TData);
      },
    },
  );
}

export function useRestaurantSuppliersQuery() {
  return useSuppliersQuery(
    { module: 'RESTAURANT' },
    { select: mapRestaurantSuppliers },
  );
}

export function useRestaurantGoodsReceiptsQuery<
  TData = ApiGoodsReceipt[],
>(select?: (receipts: ApiGoodsReceipt[]) => TData) {
  return useGoodsReceiptsQuery(
    { module: 'RESTAURANT' },
    { select: select ?? ((receipts) => receipts as TData) },
  );
}

export function useRestaurantGoodsRecordsQuery() {
  return useQuery({
    queryKey: [
      ...domainQueryKeys.goodsReceipts,
      { module: 'RESTAURANT', includePending: true },
    ],
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
          productName:
            line.purchaseOrderItem?.name ??
            line.inventoryItem?.name ??
            'Item',
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
            sum +
            line.receivedQty * (line.purchaseOrderItem?.unitPrice ?? 0),
          0,
        ),
        receivedBy:
          receipt.receivedBy?.name ?? receipt.receivedBy?.email ?? '',
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
              (item) =>
                item.receivedQty + item.rejectedQty < item.quantity,
            ),
        )
        .map((order) => ({
          id: `GR-${order.orderNumber}`,
          poId: order.id,
          supplier: order.supplier?.name ?? '',
          receivedDate: toDateInput(
            order.expectedDelivery ?? order.createdAt,
          ),
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
