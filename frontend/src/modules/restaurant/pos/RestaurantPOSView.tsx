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
} from '../../lib/restaurant';
import { usePOSSettingsQuery } from '../../lib/domainQueries';
import { usePOSCart } from '../../shared/pos';
import {
  calculateConfiguredCharges,
  getPOSPayments,
  getPOSPricing,
} from '../../shared/pos/settings';
import { PrintableReceipt, createReceiptSnapshot } from '../../shared/receipts';

type RestaurantRecipe = {
  id: string;
  name: string;
  category: string;
  sellingPrice?: number;
  suggestedSellingPrice?: number;
  isActive?: boolean;
  menuItemId?: string | null;
};

export default function RestaurantPOSView() {
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
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Restaurant POS</h1>
          <p className="text-sm text-muted-foreground">Create menu orders, collect payment, issue receipts, and deduct recipe ingredients.</p>
        </div>
        <select
          value={selectedLocationId}
          onChange={(event) => setSelectedLocationId(event.target.value)}
          className="rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {locations.map((location: any) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search menu..."
                className="w-full rounded-lg border border-input bg-input-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="inline-flex overflow-hidden rounded-lg border border-border bg-card">
              {(['DINE_IN', 'TAKEOUT'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`px-4 py-2 text-sm font-medium ${orderType === type ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'}`}
                >
                  {type === 'DINE_IN' ? 'Dine In' : 'Takeout'}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-4 py-2 text-xs font-medium ${selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
            >
              All ({menuItems.length})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-xs font-medium ${selectedCategory === category ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
              >
                {category}
              </button>
            ))}
          </div>

          {menuItems.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
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
                    className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{recipe.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{recipe.category}</p>
                    <p className="mt-4 text-xl font-bold text-primary">PHP {price.toLocaleString()}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Current Order</h2>
            </div>
            {cart.items.length > 0 && (
              <button type="button" onClick={handleClearCart} className="text-xs font-medium text-destructive hover:underline">
                Clear
              </button>
            )}
          </div>

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
                className="rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
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
                className="rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="mb-4 max-h-[320px] space-y-2 overflow-y-auto">
            {cart.items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Cart is empty</div>
            ) : (
              cart.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        PHP {item.unitPrice.toLocaleString()} | {item.itemType === 'takeout' ? 'Takeout' : 'Dine in'}
                      </p>
                      {item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}
                      {(item.customizations?.length ?? 0) > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.customizations?.map(String).join(', ')}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => setEditingCartItemId(item.id)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => cart.removeItem(item.id)} className="rounded p-1 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => cart.updateQuantity(item.id, item.quantity - 1)} className="rounded bg-muted p-1 text-foreground">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button type="button" onClick={() => cart.updateQuantity(item.id, item.quantity + 1)} className="rounded bg-muted p-1 text-foreground">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-primary">PHP {item.totalPrice.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.items.length > 0 && (
            <div className="mb-4 space-y-3">
              <input
                value={cart.customer.name ?? ''}
                onChange={(event) => cart.setCustomer({ ...cart.customer, name: event.target.value })}
                placeholder="Customer name"
                className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <select
                value={discountKind}
                onChange={(event) => setDiscountKind(event.target.value as typeof discountKind)}
                className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
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
                  className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
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
                  className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              )}
            </div>
          )}

          <div className="mb-4 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>PHP {subtotal.toLocaleString()}</span></div>
            {discount > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>-PHP {discount.toLocaleString()}</span></div>}
            {tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>PHP {tax.toLocaleString()}</span></div>}
            {serviceCharge > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>PHP {serviceCharge.toLocaleString()}</span></div>}
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">PHP {total.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={openPayment}
            disabled={cart.items.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <CreditCard className="h-5 w-5" />
            Pay Now
          </button>
          <button
            type="button"
            onClick={handleSaveAndContinueToPayment}
            disabled={cart.items.length === 0 || saving}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-foreground hover:border-primary disabled:opacity-50"
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
    </div>
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
