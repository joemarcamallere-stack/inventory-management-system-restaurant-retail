export type UserRole =
  | 'Admin'
  | 'Manager'
  | 'Staff'
  | 'Cashier'
  | 'KitchenStaff'
  | 'RetailStaff';

export type UserStatus = 'Active' | 'Inactive';

export interface ApiActor {
  id: string;
  name: string;
  email?: string;
}

export interface ApiLocation {
  id: string;
  name: string;
  address: string;
  manager: string;
  phone: string;
  itemCount: number;
  _count?: { items: number };
}

export interface ApiUser extends ApiActor {
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
}

export interface ApiInventoryItem {
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
  location?: ApiLocation;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSupplier {
  id: string;
  name: string;
  module: BusinessModule;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  category?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface ApiPurchaseOrderItem {
  id: string;
  inventoryItemId?: string | null;
  inventoryItem?: ApiInventoryItem | null;
  name: string;
  quantity: number;
  receivedQty: number;
  rejectedQty: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ApiPurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId?: string | null;
  supplier?: ApiSupplier | null;
  module: BusinessModule;
  status: PurchaseOrderStatus;
  notes?: string | null;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Check' | 'Credit Terms' | null;
  paymentTerms?: string | null;
  expectedDelivery?: string | null;
  rejectionReason?: string | null;
  totalAmount: number;
  createdBy?: ApiActor | null;
  receivedBy?: ApiActor | null;
  receivedAt?: string | null;
  items: ApiPurchaseOrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApiGoodsReceiptItem {
  id: string;
  purchaseOrderItemId: string;
  purchaseOrderItem?: ApiPurchaseOrderItem;
  inventoryItemId?: string | null;
  inventoryItem?: ApiInventoryItem | null;
  receivedQty: number;
  rejectedQty: number;
  condition?: 'Excellent' | 'Good' | 'Fair' | 'Damaged' | null;
  notes?: string | null;
}

export interface ApiGoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: ApiPurchaseOrder;
  module: BusinessModule;
  receivedBy?: ApiActor | null;
  notes?: string | null;
  items: ApiGoodsReceiptItem[];
  createdAt: string;
}

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface ApiTransferItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: ApiInventoryItem;
  quantity: number;
}

export interface ApiTransfer {
  id: string;
  transferNumber: string;
  fromLocationId: string;
  fromLocation?: ApiLocation | null;
  toLocationId: string;
  toLocation?: ApiLocation | null;
  module: BusinessModule;
  status: TransferStatus;
  notes?: string | null;
  createdBy?: ApiActor | null;
  completedAt?: string | null;
  items: ApiTransferItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApiStockMovement {
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
  unit?: string | null;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  itemId: string;
  item?: ApiInventoryItem;
  locationId: string;
  location?: ApiLocation;
  module: BusinessModule;
  createdBy?: ApiActor | null;
  createdAt: string;
}

export type SaleStatus = 'COMPLETED' | 'REFUNDED' | 'PARTIAL_REFUND';

export interface ApiSaleItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: ApiInventoryItem;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ApiSale {
  id: string;
  transactionNumber: string;
  module: BusinessModule;
  locationId: string;
  location?: ApiLocation;
  cashier?: ApiActor | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  customer?: string | null;
  status: SaleStatus;
  refundReason?: string | null;
  refundedAt?: string | null;
  items: ApiSaleItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApiReportQuery {
  from?: string;
  to?: string;
  locationId?: string;
  module?: BusinessModule;
  cashierId?: string;
  status?: SaleStatus;
}

export interface ApiPeriodReportQuery extends ApiReportQuery {
  granularity?: 'day' | 'week' | 'month';
}

export interface ApiTopReportQuery extends ApiReportQuery {
  limit?: number;
}

export interface ApiSalesSummary {
  from: string;
  to: string;
  grossSales: number;
  discounts: number;
  tax: number;
  netSales: number;
  transactionCount: number;
  averageTicket: number;
  totalRefunds: number;
  totalVoids: number;
}

export interface ApiSalesByPeriodPoint {
  period: string;
  grossSales: number;
  refunds: number;
  netSales: number;
}

export interface ApiSalesByPaymentMethod {
  paymentMethod: string;
  transactionCount: number;
  grossSales: number;
}

export interface ApiSalesByItem {
  inventoryItemId: string;
  name: string;
  quantitySold: number;
  grossSales: number;
}

export interface ApiSalesByLocation {
  locationId: string;
  locationName: string;
  transactionCount: number;
  grossSales: number;
}

export interface ApiSalesByCashier {
  cashierId?: string | null;
  cashierName: string;
  transactionCount: number;
  grossSales: number;
}

export interface ApiSalesByOrderType {
  orderType: POSOrderType;
  orderCount: number;
  grossSales: number;
}

export type BundleStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'INACTIVE';

export interface ApiBundleItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: Pick<
    ApiInventoryItem,
    'id' | 'name' | 'price' | 'quantity' | 'category'
  >;
  quantity: number;
}

export interface ApiBundle {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  discount: number;
  price: number;
  status: BundleStatus;
  rejectionReason?: string | null;
  locationId?: string | null;
  location?: Pick<ApiLocation, 'id' | 'name'> | null;
  createdBy?: ApiActor | null;
  approvedBy?: ApiActor | null;
  approvedAt?: string | null;
  items: ApiBundleItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApiRecipeIngredient {
  id: string;
  itemId: string;
  item: ApiInventoryItem;
  quantity: number;
  unit?: string | null;
  unitCost?: number | null;
  totalCost?: number | null;
}

export interface ApiRecipe {
  id: string;
  name: string;
  category: string;
  servings: number;
  yieldPercentage: number;
  prepTimeMinutes?: number | null;
  instructions?: string | null;
  targetFoodCost?: number | null;
  sellingPrice?: number | null;
  isActive: boolean;
  imageUrl?: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  isHalal: boolean;
  allergenNotes?: string | null;
  menuItemId?: string | null;
  menuItem?: ApiInventoryItem | null;
  ingredients: ApiRecipeIngredient[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApiIngredientAlternative {
  id: string;
  parentIngredientId: string;
  parentIngredientName: string;
  alternativeIngredientId: string;
  alternativeIngredientName: string;
  additionalPrice: number;
  isAvailable: boolean;
  businessId: string;
  createdAt: string;
  updatedAt?: string;
}

export type KitchenOrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'VOIDED';

export interface ApiKitchenOrder {
  id: string;
  receiptNo: string;
  quantity: number;
  status: KitchenOrderStatus;
  notes?: string | null;
  voidReason?: string | null;
  voidedAt?: string | null;
  recipeId: string;
  recipe: ApiRecipe;
  locationId?: string | null;
  location?: Pick<ApiLocation, 'id' | 'name'> | null;
  tableId?: string | null;
  table?: { id: string; tableNumber: string } | null;
  saleId?: string | null;
  sale?: { id: string; transactionNumber: string } | null;
  posOrderId?: string | null;
  posOrder?: {
    id: string;
    orderNumber: string;
    status: POSOrderStatus;
    paymentStatus: POSPaymentStatus;
  } | null;
  completedBy?: ApiActor | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiCategory {
  id: string;
  name: string;
  module: BusinessModule;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type RestaurantSettingKey =
  | 'CATEGORY_HIERARCHY'
  | 'STORAGE_TEMPERATURE_OPTIONS'
  | 'PRODUCT_MERGE_METADATA';

export interface ApiRestaurantSetting {
  key: RestaurantSettingKey;
  value: unknown;
}

export interface ApiBusinessSetting {
  key: string;
  value: unknown;
}

export interface ApiPOSSetting {
  key: string;
  value: unknown;
  module: BusinessModule;
}

export type POSOrderType = 'DINE_IN' | 'TAKEOUT' | 'MIXED' | 'RETAIL';
export type POSOrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'VOIDED';
export type POSPaymentStatus =
  | 'NOT_PAID'
  | 'PAID'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'VOIDED';
export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'VOIDED';

export interface ApiPOSOrderItem {
  id: string;
  inventoryItemId?: string | null;
  recipeId?: string | null;
  name: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemType?: string | null;
  notes?: string | null;
  customizations?: unknown;
}

export interface ApiPayment {
  id: string;
  paymentNumber: string;
  method: string;
  amountDue: number;
  amountPaid: number;
  change: number;
  status: PaymentStatus;
  saleId?: string | null;
  sale?: { id: string; transactionNumber: string; module: BusinessModule; status: SaleStatus } | null;
  posOrderId?: string | null;
  posOrder?: {
    id: string;
    orderNumber: string;
    orderType: POSOrderType;
    module: BusinessModule;
    status: POSOrderStatus;
  } | null;
  processedBy?: ApiActor | null;
  receipts?: Pick<ApiReceipt, 'id' | 'receiptNumber' | 'printedAt' | 'createdAt'>[];
  paidAt: string;
  createdAt?: string;
}

export interface ApiReceipt {
  id: string;
  receiptNumber: string;
  receiptData: unknown;
  saleId?: string | null;
  sale?: { id: string; transactionNumber: string; module: BusinessModule; status: SaleStatus } | null;
  posOrderId?: string | null;
  posOrder?: {
    id: string;
    orderNumber: string;
    orderType: POSOrderType;
    module: BusinessModule;
    status: POSOrderStatus;
  } | null;
  paymentId?: string | null;
  payment?: Pick<ApiPayment, 'id' | 'paymentNumber' | 'method' | 'status' | 'amountPaid'> | null;
  printedAt?: string | null;
  createdAt: string;
}

export interface ApiPOSOrder {
  id: string;
  orderNumber: string;
  orderType: POSOrderType;
  status: POSOrderStatus;
  paymentStatus: POSPaymentStatus;
  customerName?: string | null;
  contactNumber?: string | null;
  tableName?: string | null;
  partySize?: number | null;
  subtotal: number;
  discount: number;
  discountType?: string | null;
  tax: number;
  serviceCharge: number;
  total: number;
  notes?: string | null;
  voidReason?: string | null;
  voidedAt?: string | null;
  completedAt?: string | null;
  locationId: string;
  location?: Pick<ApiLocation, 'id' | 'name'>;
  tableId?: string | null;
  table?: { id: string; tableNumber: string; status: DiningTableStatus } | null;
  saleId?: string | null;
  sale?: { id: string; transactionNumber: string; status: SaleStatus } | null;
  module: BusinessModule;
  items: ApiPOSOrderItem[];
  payments?: ApiPayment[];
  receipts?: ApiReceipt[];
  createdBy?: ApiActor | null;
  createdAt: string;
  updatedAt?: string;
}

export type DiningTableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'CLEANING';

export interface ApiDiningTable {
  id: string;
  tableNumber: string;
  capacity: number;
  status: DiningTableStatus;
  floor?: string | null;
  locationId: string;
  location?: Pick<ApiLocation, 'id' | 'name'>;
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type BusinessModule = 'RETAIL' | 'RESTAURANT';
