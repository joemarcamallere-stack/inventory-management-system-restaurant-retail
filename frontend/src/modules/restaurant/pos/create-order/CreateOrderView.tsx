import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  CheckCircle,
  CreditCard,
  Edit3,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import {
  useCompleteRestaurantPOSOrderPaymentMutation,
  useCreateRestaurantPOSOrderMutation,
  useRestaurantDiningTablesQuery,
  useRestaurantLocationsQuery,
  useRestaurantRecipesQuery,
} from '../../../lib/restaurant';
import { usePOSSettingsQuery } from '../../../lib/domainQueries';
import { usePOSCart } from '../../../shared/pos';
import {
  calculateConfiguredCharges,
  getPOSPayments,
  getPOSPricing,
} from '../../../shared/pos/settings';
import { PrintableReceipt, createReceiptSnapshot } from '../../../shared/receipts';

type RestaurantRecipe = {
  id: string;
  name: string;
  category: string;
  sellingPrice?: number;
  suggestedSellingPrice?: number;
  isActive?: boolean;
  menuItemId?: string | null;
};

export default function CreateOrderView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEOUT'>('DINE_IN');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [discountKind, setDiscountKind] = useState<'NONE' | 'SENIOR' | 'PWD' | 'PROMO' | 'CUSTOM'>('NONE');
  const [discountReference, setDiscountReference] = useState('');
  const [manualDiscount, setManualDiscount] = useState(0);
  const [saving, setSaving] = useState(false);

  const cart = usePOSCart();
  const { data: locations = [], isLoading: locationsLoading } = useRestaurantLocationsQuery();
  const { data: recipes = [], isLoading: recipesLoading } = useRestaurantRecipesQuery();
  const { data: diningTables = [], isLoading: tablesLoading } = useRestaurantDiningTablesQuery({
    locationId: selectedLocationId || undefined,
    limit: 200,
  });
  const createPOSOrder = useCreateRestaurantPOSOrderMutation();
  const completePayment = useCompleteRestaurantPOSOrderPaymentMutation();
  const { data: posSettings = [] } = usePOSSettingsQuery({ module: 'RESTAURANT' });

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    setSelectedTableId('');
  }, [selectedLocationId]);

  const pricingSettings = useMemo(
    () => getPOSPricing(posSettings),
    [posSettings],
  );
  const paymentSettings = useMemo(
    () => getPOSPayments(posSettings),
    [posSettings],
  );
  const availablePaymentMethods = paymentSettings.methods.length > 0
    ? paymentSettings.methods
    : ['Cash'];

  useEffect(() => {
    if (!availablePaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0] ?? 'Cash');
    }
  }, [availablePaymentMethods, paymentMethod]);

  const menuItems = (recipes as RestaurantRecipe[])
    .filter((recipe) => recipe.isActive ?? true)
    .filter((recipe) => recipe.sellingPrice || recipe.suggestedSellingPrice)
    .filter((recipe) => recipe.menuItemId);
  const categories = Array.from(new Set(menuItems.map((item) => item.category || 'Uncategorized'))).sort();
  const filteredMenuItems = menuItems.filter((item) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = !query ||
      item.name.toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const subtotal = cart.totals.subtotal;
  const discount = cart.totals.discount;
  const serviceCharge = cart.totals.serviceCharge;
  const tax = cart.totals.tax;
  const total = cart.totals.total;
  const change = amountPaid - total;
  const hasDineInItems = cart.items.some((item) => item.itemType !== 'takeout');
  const hasTakeoutItems = cart.items.some((item) => item.itemType === 'takeout');
  const effectiveOrderType = hasDineInItems && hasTakeoutItems ? 'MIXED' : hasTakeoutItems ? 'TAKEOUT' : orderType;
  const editingCartItem = cart.items.find((item) => item.id === editingCartItemId) ?? null;

  useEffect(() => {
    const nextDiscount = discountKind === 'SENIOR' || discountKind === 'PWD'
      ? Math.round(subtotal * 20) / 100
      : discountKind === 'PROMO' || discountKind === 'CUSTOM'
        ? manualDiscount
        : 0;
    const discountType = discountKind === 'NONE'
      ? undefined
      : [discountKind, discountReference.trim() ? `REF:${discountReference.trim()}` : undefined].filter(Boolean).join(' ');
    cart.setDiscount(nextDiscount, discountType);
  }, [cart, discountKind, discountReference, manualDiscount, subtotal]);

  useEffect(() => {
    const charges = calculateConfiguredCharges(subtotal, discount, pricingSettings);
    cart.setTax(charges.tax);
    cart.setServiceCharge(charges.serviceCharge);
  }, [
    cart,
    discount,
    pricingSettings.serviceChargeEnabled,
    pricingSettings.serviceChargeRate,
    pricingSettings.taxEnabled,
    pricingSettings.taxRate,
    subtotal,
  ]);
  const lastPayment = lastTransaction?.payments?.[0];
  const lastReceipt = lastTransaction?.receipts?.[0];
  const lastTransactionNumber = lastTransaction?.sale?.transactionNumber ?? lastTransaction?.orderNumber;
  const lastPaymentMethod = lastPayment?.method ?? paymentMethod;
  const lastReceiptSnapshot = lastTransaction
    ? createReceiptSnapshot({
        receiptNumber: lastReceipt?.receiptNumber,
        transactionNumber: lastTransaction?.sale?.transactionNumber,
        orderNumber: lastTransaction?.orderNumber,
        customerName: lastTransaction?.customerName ?? undefined,
        paymentMethod: lastPaymentMethod,
        items: lastTransaction?.items ?? [],
        totals: {
          subtotal: lastTransaction?.subtotal ?? 0,
          discount: lastTransaction?.discount ?? 0,
          tax: lastTransaction?.tax ?? 0,
          serviceCharge: lastTransaction?.serviceCharge ?? 0,
          total: lastTransaction?.total ?? 0,
          amountPaid: lastPayment?.amountPaid ?? lastTransaction?.amountPaid ?? 0,
          change: lastPayment?.change ?? lastTransaction?.change ?? 0,
        },
      })
    : null;
  const selectedTable = diningTables.find((table) => table.id === selectedTableId);
  const selectableTables = diningTables.filter(
    (table) =>
      table.status === 'AVAILABLE' ||
      table.status === 'RESERVED' ||
      table.id === selectedTableId,
  );

  const addRecipeToCart = (recipe: RestaurantRecipe) => {
    const price = recipe.sellingPrice ?? recipe.suggestedSellingPrice ?? 0;
    cart.addItem({
      id: recipe.id,
      kind: 'recipe',
      recipeId: recipe.id,
      name: recipe.name,
      category: recipe.category,
      unitPrice: price,
      itemType: orderType === 'DINE_IN' ? 'dine-in' : 'takeout',
    });
  };

  const handleClearCart = () => {
    cart.clear();
    setAmountPaid(0);
    setSelectedTableId('');
    setPartySize(1);
    setDiscountKind('NONE');
    setDiscountReference('');
    setManualDiscount(0);
  };

  const openPayment = () => {
    if (cart.items.length === 0) return;
    setAmountPaid(paymentMethod === 'Cash' ? Math.ceil(total / 100) * 100 : total);
    setShowPaymentModal(true);
  };

  const validateOrderBeforeSave = () => {
    if (cart.items.length === 0) {
      alert('Cart is empty');
      return false;
    }
    if (!selectedLocationId) {
      alert('Please select a location first');
      return false;
    }
    if (hasDineInItems && !selectedTable) {
      alert('Please select an available table for dine-in or mixed orders');
      return false;
    }
    return true;
  };

  const handleSaveAndContinueToPayment = async () => {
    if (!validateOrderBeforeSave()) return;

    setSaving(true);
    try {
      const order = await createPOSOrder.mutateAsync(
        cart.createPOSOrderPayload({
          locationId: selectedLocationId,
          orderType: effectiveOrderType,
          status: 'PENDING',
          tableId: hasDineInItems ? selectedTable.id : undefined,
          tableName: hasDineInItems ? selectedTable.tableNumber : undefined,
          partySize: hasDineInItems ? partySize : undefined,
        }),
      );
      handleClearCart();
      const next = new URLSearchParams(searchParams);
      next.set('view', 'restaurant-payment');
      next.set('orderId', order.id);
      setSearchParams(next);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save restaurant POS order');
    } finally {
      setSaving(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!validateOrderBeforeSave()) return;
    if (paymentMethod === 'Cash' && amountPaid < total) {
      alert('Insufficient payment amount');
      return;
    }

    setSaving(true);
    try {
      const order = await createPOSOrder.mutateAsync(
        cart.createPOSOrderPayload({
          locationId: selectedLocationId,
          orderType: effectiveOrderType,
          status: 'PENDING',
          tableId: hasDineInItems ? selectedTable.id : undefined,
          tableName: hasDineInItems ? selectedTable.tableNumber : undefined,
          partySize: hasDineInItems ? partySize : undefined,
        }),
      );
      const paidOrder = await completePayment.mutateAsync({
        id: order.id,
        paymentMethod,
        amountPaid: paymentMethod === 'Cash' ? amountPaid : total,
        receiptData: createReceiptSnapshot({
          orderNumber: order.orderNumber,
          customerName: cart.customer.name || undefined,
          paymentMethod,
          items: cart.items,
          totals: {
            subtotal,
            discount,
            tax,
            serviceCharge,
            total,
            amountPaid: paymentMethod === 'Cash' ? amountPaid : total,
            change: paymentMethod === 'Cash' ? amountPaid - total : 0,
          },
        }),
      });
      setLastTransaction({
        ...paidOrder,
        paymentMethod,
        amountPaid: paymentMethod === 'Cash' ? amountPaid : total,
        change: paymentMethod === 'Cash' ? amountPaid - total : 0,
      });
      handleClearCart();
      setShowPaymentModal(false);
      setShowReceiptModal(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process restaurant POS payment');
    } finally {
      setSaving(false);
    }
  };

  if (locationsLoading || recipesLoading || tablesLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading restaurant POS...</div>;
  }

  return (
    <>
    <div className="flex min-h-full bg-[#f8fafb] text-[#0f172a]">
      <section className="flex-1 px-10 py-6">
        <h1 className="mb-5 text-[22px] font-semibold leading-7 text-[#0f172a]">Menu</h1>
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search Products"
            className="h-[38px] w-full rounded-[8px] border border-[#dfe5ec] bg-white py-2 pl-10 pr-4 text-[15px] text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#008967]"
          />
        </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-[8px] px-4 py-2 text-[14px] font-semibold ${selectedCategory === 'all' ? 'bg-[#008967] text-white shadow-sm' : 'bg-white text-[#0f172a]'}`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-[8px] px-4 py-2 text-[14px] font-semibold ${selectedCategory === category ? 'bg-[#008967] text-white shadow-sm' : 'bg-white text-[#0f172a]'}`}
              >
                {category}
              </button>
            ))}
          </div>

          {menuItems.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-[#94a3b8]">
              No active recipes with linked menu items and prices are ready for POS yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filteredMenuItems.map((recipe) => {
                const price = recipe.sellingPrice ?? recipe.suggestedSellingPrice ?? 0;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => addRecipeToCart(recipe)}
                    className="rounded-[8px] border border-[#dfe5ec] bg-white p-3 text-left transition-colors hover:border-[#008967] hover:bg-[#f3fbf8]"
                  >
                    <p className="line-clamp-2 text-[14px] font-medium text-[#0f172a]">{recipe.name}</p>
                    <p className="mt-1 text-[12px] text-[#94a3b8]">{recipe.category}</p>
                    <p className="mt-4 text-[18px] font-bold text-[#007a5e]">PHP {price.toLocaleString()}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="flex h-screen w-[320px] shrink-0 flex-col border-l border-[#e7edf3] bg-white px-5 py-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[#008967]" />
              <h2 className="text-[16px] font-medium text-[#0f172a]">Order Summary</h2>
            </div>
            {cart.items.length > 0 && (
              <button type="button" onClick={handleClearCart} className="text-[12px] font-medium text-[#dc2626] hover:underline">
                Clear All
              </button>
            )}
          </div>

          <label className="mb-1 block text-[13px] font-medium text-[#64748b]">Customer Name (Optional):</label>
          <input
            value={cart.customer.name ?? ''}
            onChange={(event) => cart.setCustomer({ ...cart.customer, name: event.target.value })}
            placeholder="Enter customer name if available"
            className="mb-4 h-[38px] w-full rounded-[8px] border border-[#dfe5ec] bg-[#f8fafb] px-3 text-[14px] outline-none placeholder:text-[#94a3b8] focus:border-[#008967]"
          />

          <label className="mb-1 block text-[13px] font-medium text-[#64748b]">Select Dining Option:</label>
          <select
            value={orderType}
            onChange={(event) => setOrderType(event.target.value as typeof orderType)}
            className="mb-4 h-[38px] w-full rounded-[8px] border border-[#dfe5ec] bg-white px-3 text-[14px] text-[#64748b] outline-none focus:border-[#008967]"
          >
            <option value="DINE_IN">Dine In</option>
            <option value="TAKEOUT">Takeout</option>
          </select>

          {hasDineInItems && (
            <div className="mb-4 grid grid-cols-[1fr_90px] gap-2">
              <select
                value={selectedTableId}
                onChange={(event) => {
                  const nextTableId = event.target.value;
                  setSelectedTableId(nextTableId);
                  const table = diningTables.find((item) => item.id === nextTableId);
                  if (table?.capacity && partySize > table.capacity) {
                    setPartySize(table.capacity);
                  }
                }}
                className="rounded-[8px] border border-[#dfe5ec] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#008967]"
              >
                <option value="">Select table</option>
                {selectableTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.tableNumber} ({table.status.toLowerCase()}, {table.capacity} seats)
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={selectedTable?.capacity}
                value={partySize}
                onChange={(event) => {
                  const nextPartySize = Math.max(1, Number(event.target.value) || 1);
                  setPartySize(selectedTable?.capacity ? Math.min(nextPartySize, selectedTable.capacity) : nextPartySize);
                }}
                className="rounded-[8px] border border-[#dfe5ec] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#008967]"
              />
            </div>
          )}

          <div className="mb-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {cart.items.length === 0 ? (
              <div className="flex h-full min-h-[220px] items-center justify-center text-center text-[13px] text-[#94a3b8]">No items in cart</div>
            ) : (
              cart.items.map((item) => (
                <div key={item.id} className="rounded-[8px] border border-[#dfe5ec] p-3">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-medium text-[#0f172a]">{item.name}</p>
                      <p className="text-[12px] text-[#94a3b8]">
                        PHP {item.unitPrice.toLocaleString()} | {item.itemType === 'takeout' ? 'Takeout' : 'Dine in'}
                      </p>
                      {item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}
                      {(item.customizations?.length ?? 0) > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.customizations?.map(String).join(', ')}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => setEditingCartItemId(item.id)} className="rounded p-1 text-[#64748b] hover:bg-[#f1f5f9]">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => cart.removeItem(item.id)} className="rounded p-1 text-[#dc2626] hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => cart.updateQuantity(item.id, item.quantity - 1)} className="flex size-6 items-center justify-center rounded bg-[#f1f5f9] text-[#0f172a]">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-[14px] font-medium">{item.quantity}</span>
                      <button type="button" onClick={() => cart.updateQuantity(item.id, item.quantity + 1)} className="flex size-6 items-center justify-center rounded bg-[#f1f5f9] text-[#0f172a]">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[14px] font-bold text-[#007a5e]">PHP {item.totalPrice.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mb-3 border-t border-[#e7edf3] pt-3">
            {cart.items.length > 0 && (
              <div className="mb-3 space-y-2">
              <select
                value={discountKind}
                onChange={(event) => setDiscountKind(event.target.value as typeof discountKind)}
                className="w-full rounded-[8px] border border-[#dfe5ec] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#008967]"
              >
                <option value="NONE">No discount</option>
                <option value="SENIOR">Senior Citizen 20%</option>
                <option value="PWD">PWD 20%</option>
                <option value="PROMO">Promo amount</option>
                <option value="CUSTOM">Custom amount</option>
              </select>
              {discountKind !== 'NONE' && (
                <input
                  value={discountReference}
                  onChange={(event) => setDiscountReference(event.target.value)}
                  placeholder={discountKind === 'PROMO' ? 'Promo code' : 'Reference / ID number'}
                  className="w-full rounded-[8px] border border-[#dfe5ec] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#008967]"
                />
              )}
              {(discountKind === 'PROMO' || discountKind === 'CUSTOM') && (
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  value={manualDiscount}
                  onChange={(event) => setManualDiscount(Number(event.target.value))}
                  placeholder="Discount amount"
                  className="w-full rounded-[8px] border border-[#dfe5ec] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#008967]"
                />
              )}
              </div>
            )}
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#94a3b8]">Subtotal:</span><span className="font-medium text-[#0f172a]">PHP {subtotal.toLocaleString()}</span></div>
              {serviceCharge > 0 && <div className="flex justify-between"><span className="text-[#94a3b8]">Service Fee:</span><span className="font-medium text-[#0f172a]">PHP {serviceCharge.toLocaleString()}</span></div>}
              {discount > 0 && <div className="flex justify-between"><span className="text-[#94a3b8]">Discount:</span><span className="font-medium text-[#dc2626]">-PHP {discount.toLocaleString()}</span></div>}
              {tax > 0 && <div className="flex justify-between"><span className="text-[#94a3b8]">Tax:</span><span className="font-medium text-[#0f172a]">PHP {tax.toLocaleString()}</span></div>}
              <div className="flex justify-between border-t border-[#e7edf3] pt-3 text-[13px] font-bold">
                <span className="text-[#0f172a]">TOTAL:</span>
                <span className="text-[#008967]">PHP {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openPayment}
            disabled={cart.items.length === 0}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#007a5e] px-4 text-[14px] font-bold text-white hover:bg-[#00634d] disabled:cursor-not-allowed disabled:bg-[#e2e8f0] disabled:text-[#94a3b8]"
          >
            PREVIEW ORDER
          </button>
          <button
            type="button"
            onClick={handleSaveAndContinueToPayment}
            disabled={cart.items.length === 0 || saving}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#dfe5ec] px-4 text-[13px] font-semibold text-[#0f172a] hover:border-[#008967] disabled:opacity-50"
          >
            <Receipt className="h-5 w-5" />
            Save and Continue to Payment
          </button>
        </aside>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-foreground">Payment</h2>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {availablePaymentMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method);
                    setAmountPaid(method === 'Cash' ? Math.ceil(total / 100) * 100 : total);
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${paymentMethod === method ? 'border-primary bg-primary text-white' : 'border-border text-foreground hover:border-primary'}`}
                >
                  {method}
                </button>
              ))}
            </div>
            <div className="mb-4 rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-lg font-bold text-primary">PHP {total.toLocaleString()}</span>
              </div>
            </div>
            {paymentMethod === 'Cash' && (
              <>
                <input
                  type="number"
                  min={total}
                  value={amountPaid}
                  onChange={(event) => setAmountPaid(Number(event.target.value))}
                  className="mb-3 w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {amountPaid >= total && (
                  <div className="mb-4 rounded-lg bg-primary/10 p-3 text-sm font-semibold text-primary">
                    Change: PHP {change.toLocaleString()}
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 rounded-lg bg-muted px-4 py-3 text-sm font-medium text-foreground">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={saving || (paymentMethod === 'Cash' && amountPaid < total)}
                className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Processing...' : 'Complete Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCartItem && (
        <CartItemDetailsModal
          item={editingCartItem}
          onClose={() => setEditingCartItemId(null)}
          onSave={(details) => {
            cart.updateItemDetails(editingCartItem.id, details);
            setEditingCartItemId(null);
          }}
        />
      )}

      {showReceiptModal && lastTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5 text-center">
              <CheckCircle className="mx-auto mb-3 h-14 w-14 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Payment Completed</h2>
              <p className="text-sm text-muted-foreground">{lastTransactionNumber}</p>
              {lastReceipt?.receiptNumber && <p className="text-xs text-muted-foreground">{lastReceipt.receiptNumber}</p>}
            </div>
            {lastReceiptSnapshot && (
              <div className="mb-4">
                <PrintableReceipt receipt={lastReceiptSnapshot} issuedAt={lastTransaction.createdAt} />
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowReceiptModal(false)} className="flex-1 rounded-lg bg-muted px-4 py-3 text-sm font-medium text-foreground">
                Done
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white">
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CartItemDetailsModal({
  item,
  onClose,
  onSave,
}: {
  item: {
    itemType?: string | null;
    notes?: string | null;
    customizations?: unknown[];
  };
  onClose: () => void;
  onSave: (details: { itemType: string; notes?: string; customizations: string[] }) => void;
}) {
  const [itemType, setItemType] = useState(item.itemType === 'takeout' ? 'takeout' : 'dine-in');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [customizations, setCustomizations] = useState(
    (item.customizations ?? []).map(String).join('\n'),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-foreground">Item Details</h2>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {[
            ['dine-in', 'Dine In'],
            ['takeout', 'Takeout'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setItemType(value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${itemType === value ? 'border-primary bg-primary text-white' : 'border-border text-foreground hover:border-primary'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Kitchen or cashier notes"
          className="mb-3 min-h-24 w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <textarea
          value={customizations}
          onChange={(event) => setCustomizations(event.target.value)}
          placeholder="Customizations, one per line"
          className="mb-4 min-h-24 w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-muted px-4 py-3 text-sm font-medium text-foreground">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({
              itemType,
              notes: notes.trim() || undefined,
              customizations: customizations
                .split('\n')
                .map((value) => value.trim())
                .filter(Boolean),
            })}
            className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
