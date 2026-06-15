export type RetailUserRole =
  | 'Admin'
  | 'Manager'
  | 'Staff'
  | 'Cashier'
  | 'KitchenStaff'
  | 'RetailStaff';

export type RetailUserStatus = 'Active' | 'Inactive';

export interface RetailApiActor {
  id: string;
  name: string;
  email?: string;
}

export interface RetailApiLocation {
  id: string;
  name: string;
  address: string;
  manager: string;
  phone: string;
  itemCount: number;
  _count?: { items: number };
}

export interface RetailApiUser extends RetailApiActor {
  email: string;
  role: RetailUserRole;
  status: RetailUserStatus;
  lastLogin: string;
}

export interface RetailApiInventoryItem {
  id: string;
  name: string;
  itemType: 'RETAIL_ITEM' | 'INGREDIENT' | 'MENU_ITEM' | 'SUPPLY' | 'BUNDLE';
  sku?: string | null;
  barcode?: string | null;
  category: string;
  targetCustomer?: 'Male' | 'Female' | 'Unisex' | null;
  subcategory?: string | null;
  size?: string | null;
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Damaged' | null;
  quantity: number;
  price: number;
  costPrice?: number | null;
  imageUrl?: string | null;
  unit?: string | null;
  minStock?: number | null;
  maxStock?: number | null;
  reorderPoint?: number | null;
  expiryDate?: string | null;
  storageTemperature?: string | null;
  dateAdded: string;
  locationId: string;
  location?: RetailApiLocation;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetailApiSupplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  category?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type RetailPurchaseOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface RetailApiPurchaseOrderItem {
  id: string;
  inventoryItemId?: string | null;
  inventoryItem?: RetailApiInventoryItem | null;
  name: string;
  quantity: number;
  receivedQty: number;
  rejectedQty: number;
  unitPrice: number;
  totalPrice: number;
}

export interface RetailApiPurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId?: string | null;
  supplier?: RetailApiSupplier | null;
  status: RetailPurchaseOrderStatus;
  notes?: string | null;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Check' | 'Credit Terms' | null;
  paymentTerms?: string | null;
  expectedDelivery?: string | null;
  rejectionReason?: string | null;
  totalAmount: number;
  createdBy?: RetailApiActor | null;
  receivedBy?: RetailApiActor | null;
  receivedAt?: string | null;
  items: RetailApiPurchaseOrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface RetailApiGoodsReceiptItem {
  id: string;
  purchaseOrderItemId: string;
  purchaseOrderItem?: RetailApiPurchaseOrderItem;
  inventoryItemId?: string | null;
  inventoryItem?: RetailApiInventoryItem | null;
  receivedQty: number;
  rejectedQty: number;
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Damaged' | null;
  notes?: string | null;
}

export interface RetailApiGoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: RetailApiPurchaseOrder;
  receivedBy?: RetailApiActor | null;
  notes?: string | null;
  items: RetailApiGoodsReceiptItem[];
  createdAt: string;
}

export type RetailTransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface RetailApiTransferItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: RetailApiInventoryItem;
  quantity: number;
}

export interface RetailApiTransfer {
  id: string;
  transferNumber: string;
  fromLocationId: string;
  fromLocation?: RetailApiLocation | null;
  toLocationId: string;
  toLocation?: RetailApiLocation | null;
  status: RetailTransferStatus;
  notes?: string | null;
  createdBy?: RetailApiActor | null;
  completedAt?: string | null;
  items: RetailApiTransferItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface RetailApiStockMovement {
  id: string;
  type:
    | 'STOCK_IN'
    | 'STOCK_OUT'
    | 'ADJUSTMENT'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'SALE'
    | 'RECIPE_CONSUMPTION'
    | 'SPOILAGE'
    | 'EXPIRY'
    | 'VOID_RESTOCK';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  itemId: string;
  item?: RetailApiInventoryItem;
  locationId: string;
  location?: RetailApiLocation;
  createdBy?: RetailApiActor | null;
  createdAt: string;
}

export type RetailSaleStatus = 'COMPLETED' | 'REFUNDED' | 'PARTIAL_REFUND';

export interface RetailApiSaleItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: RetailApiInventoryItem;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface RetailApiSale {
  id: string;
  transactionNumber: string;
  locationId: string;
  location?: RetailApiLocation;
  cashier?: RetailApiActor | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  customer?: string | null;
  status: RetailSaleStatus;
  refundReason?: string | null;
  items: RetailApiSaleItem[];
  createdAt: string;
  updatedAt?: string;
}

export type RetailBundleStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'INACTIVE';

export interface RetailApiBundleItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: Pick<
    RetailApiInventoryItem,
    'id' | 'name' | 'price' | 'quantity' | 'category'
  >;
  quantity: number;
}

export interface RetailApiBundle {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  discount: number;
  price: number;
  status: RetailBundleStatus;
  rejectionReason?: string | null;
  locationId?: string | null;
  location?: Pick<RetailApiLocation, 'id' | 'name'> | null;
  createdBy?: RetailApiActor | null;
  approvedBy?: RetailApiActor | null;
  approvedAt?: string | null;
  items: RetailApiBundleItem[];
  createdAt: string;
  updatedAt?: string;
}
