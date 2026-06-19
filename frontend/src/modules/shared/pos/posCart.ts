import { useCallback, useMemo, useState } from 'react';
import type { POSOrderStatus, POSOrderType } from '../../../app/api/domainTypes';

export type POSCartItemKind = 'inventory' | 'recipe';

export type POSCartItem = {
  id: string;
  kind: POSCartItemKind;
  inventoryItemId?: string;
  recipeId?: string;
  name: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableStock?: number | null;
  itemType?: string | null;
  notes?: string | null;
  customizations?: unknown[];
};

export type POSCartInput = {
  id?: string;
  kind?: POSCartItemKind;
  inventoryItemId?: string;
  recipeId?: string;
  name: string;
  category?: string | null;
  quantity?: number;
  unitPrice: number;
  availableStock?: number | null;
  itemType?: string | null;
  notes?: string | null;
  customizations?: unknown[];
};

export type POSCartTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  total: number;
  itemCount: number;
};

export type POSCartCustomer = {
  name?: string;
  contactNumber?: string;
};

export type POSCartOrderContext = {
  locationId: string;
  orderType: POSOrderType;
  status?: POSOrderStatus;
  tableId?: string;
  tableName?: string;
  partySize?: number;
  notes?: string;
};

export type POSCartPaymentContext = {
  paymentMethod: string;
  amountPaid: number;
  receiptData?: unknown;
};

export type POSCartState = {
  items: POSCartItem[];
  discount: number;
  discountType?: string;
  tax: number;
  serviceCharge: number;
  customer: POSCartCustomer;
};

export function createPOSCartItem(input: POSCartInput): POSCartItem {
  const quantity = clampQuantity(input.quantity ?? 1, input.availableStock);
  const kind = input.kind ?? (input.recipeId ? 'recipe' : 'inventory');
  const id = input.id ?? input.inventoryItemId ?? input.recipeId ?? input.name;

  return {
    id,
    kind,
    inventoryItemId: input.inventoryItemId,
    recipeId: input.recipeId,
    name: input.name,
    category: input.category,
    quantity,
    unitPrice: input.unitPrice,
    totalPrice: roundMoney(quantity * input.unitPrice),
    availableStock: input.availableStock,
    itemType: input.itemType,
    notes: input.notes,
    customizations: input.customizations ?? [],
  };
}

export function addOrIncrementCartItem(
  items: POSCartItem[],
  input: POSCartInput,
): POSCartItem[] {
  const nextItem = createPOSCartItem(input);
  const existing = items.find((item) => item.id === nextItem.id);
  if (!existing) return [...items, nextItem];

  return items.map((item) =>
    item.id === nextItem.id
      ? setCartItemQuantity(
          item,
          item.quantity + nextItem.quantity,
          item.availableStock ?? nextItem.availableStock,
        )
      : item,
  );
}

export function setCartItemQuantity(
  item: POSCartItem,
  quantity: number,
  availableStock = item.availableStock,
): POSCartItem {
  const nextQuantity = clampQuantity(quantity, availableStock);
  return {
    ...item,
    quantity: nextQuantity,
    totalPrice: roundMoney(nextQuantity * item.unitPrice),
  };
}

export function updateCartItemQuantity(
  items: POSCartItem[],
  id: string,
  quantity: number,
): POSCartItem[] {
  if (quantity <= 0) return items.filter((item) => item.id !== id);
  return items.map((item) =>
    item.id === id ? setCartItemQuantity(item, quantity) : item,
  );
}

export function updateCartItemDetails(
  items: POSCartItem[],
  id: string,
  details: Partial<Pick<POSCartItem, 'itemType' | 'notes' | 'customizations'>>,
): POSCartItem[] {
  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          itemType: details.itemType ?? item.itemType,
          notes: details.notes ?? item.notes,
          customizations: details.customizations ?? item.customizations,
        }
      : item,
  );
}

export function calculatePOSCartTotals(
  items: POSCartItem[],
  pricing: {
    discount?: number;
    tax?: number;
    serviceCharge?: number;
  } = {},
): POSCartTotals {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.totalPrice, 0));
  const discount = clampMoney(pricing.discount ?? 0, subtotal);
  const tax = roundMoney(Math.max(0, pricing.tax ?? 0));
  const serviceCharge = roundMoney(Math.max(0, pricing.serviceCharge ?? 0));
  const total = roundMoney(Math.max(0, subtotal - discount + tax + serviceCharge));
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, discount, tax, serviceCharge, total, itemCount };
}

export function createPOSOrderPayload(
  state: POSCartState,
  context: POSCartOrderContext,
) {
  const totals = calculatePOSCartTotals(state.items, state);

  return {
    locationId: context.locationId,
    orderType: context.orderType,
    status: context.status,
    tableId: context.tableId,
    tableName: context.tableName,
    partySize: context.partySize,
    customerName: state.customer.name || undefined,
    contactNumber: state.customer.contactNumber || undefined,
    discount: totals.discount,
    discountType: state.discountType,
    tax: totals.tax,
    serviceCharge: totals.serviceCharge,
    notes: context.notes,
    items: state.items.map((item) => ({
      inventoryItemId: item.inventoryItemId,
      recipeId: item.recipeId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      itemType: item.itemType,
      notes: item.notes,
      customizations: item.customizations ?? [],
    })),
  };
}

export function createPOSPaymentPayload(
  state: POSCartState,
  payment: POSCartPaymentContext,
) {
  const totals = calculatePOSCartTotals(state.items, state);
  return {
    paymentMethod: payment.paymentMethod,
    amountPaid: payment.paymentMethod === 'Cash'
      ? payment.amountPaid
      : totals.total,
    receiptData: payment.receiptData,
  };
}

export function createSalePayload(
  state: POSCartState,
  context: {
    locationId: string;
    paymentMethod: string;
    amountPaid: number;
  },
) {
  const totals = calculatePOSCartTotals(state.items, state);
  return {
    locationId: context.locationId,
    items: state.items.map((item) => ({
      inventoryItemId: item.inventoryItemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    discount: totals.discount > 0 ? totals.discount : undefined,
    tax: totals.tax > 0 ? totals.tax : undefined,
    paymentMethod: context.paymentMethod,
    amountPaid: context.paymentMethod === 'Cash' ? context.amountPaid : totals.total,
    customer: state.customer.name || undefined,
  };
}

export function usePOSCart(initialState?: Partial<POSCartState>) {
  const [items, setItems] = useState<POSCartItem[]>(initialState?.items ?? []);
  const [discount, setDiscountValue] = useState(initialState?.discount ?? 0);
  const [discountType, setDiscountType] = useState(initialState?.discountType);
  const [tax, setTaxValue] = useState(initialState?.tax ?? 0);
  const [serviceCharge, setServiceChargeValue] = useState(initialState?.serviceCharge ?? 0);
  const [customer, setCustomer] = useState<POSCartCustomer>(initialState?.customer ?? {});

  const state: POSCartState = useMemo(
    () => ({ items, discount, discountType, tax, serviceCharge, customer }),
    [customer, discount, discountType, items, serviceCharge, tax],
  );
  const totals = useMemo(
    () => calculatePOSCartTotals(items, { discount, tax, serviceCharge }),
    [discount, items, serviceCharge, tax],
  );

  const addItem = useCallback((input: POSCartInput) => {
    setItems((current) => addOrIncrementCartItem(current, input));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) => updateCartItemQuantity(current, id, quantity));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const updateItemDetails = useCallback((
    id: string,
    details: Partial<Pick<POSCartItem, 'itemType' | 'notes' | 'customizations'>>,
  ) => {
    setItems((current) => updateCartItemDetails(current, id, details));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setDiscountValue(0);
    setDiscountType(undefined);
    setTaxValue(0);
    setServiceChargeValue(0);
    setCustomer({});
  }, []);

  const setDiscount = useCallback((value: number, type?: string) => {
    setDiscountValue(Math.max(0, value));
    setDiscountType(type);
  }, []);

  const setTax = useCallback((value: number) => setTaxValue(Math.max(0, value)), []);
  const setServiceCharge = useCallback(
    (value: number) => setServiceChargeValue(Math.max(0, value)),
    [],
  );

  return {
    ...state,
    totals,
    addItem,
    updateQuantity,
    updateItemDetails,
    removeItem,
    clear,
    setDiscount,
    setTax,
    setServiceCharge,
    setCustomer,
    createPOSOrderPayload: (context: POSCartOrderContext) =>
      createPOSOrderPayload(state, context),
    createPOSPaymentPayload: (payment: POSCartPaymentContext) =>
      createPOSPaymentPayload(state, payment),
    createSalePayload: (context: {
      locationId: string;
      paymentMethod: string;
      amountPaid: number;
    }) => createSalePayload(state, context),
  };
}

function clampQuantity(quantity: number, availableStock?: number | null) {
  const normalized = Math.max(0, quantity);
  return typeof availableStock === 'number'
    ? Math.min(normalized, Math.max(0, availableStock))
    : normalized;
}

function clampMoney(value: number, max: number) {
  return roundMoney(Math.min(Math.max(0, value), Math.max(0, max)));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
