import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, X, Search, ShoppingCart, CreditCard, Trash2, CheckCircle, Receipt, RotateCcw, Printer } from 'lucide-react';
import {
  useCompleteRetailPOSOrderPaymentMutation,
  useCreateRetailPOSOrderMutation,
  useRefundRetailSaleMutation,
  useRetailInventoryRecordsQuery,
  useRetailLocationsQuery,
  useRetailSalesQuery,
} from '../../../lib/retail';
import { usePOSSettingsQuery } from '../../../lib/domainQueries';
import { usePOSCart } from '../../../shared/pos';
import { RetailThermalReceipt } from '../receipt/RetailThermalReceipt';
import {
  calculateConfiguredCharges,
  getPOSPayments,
  getPOSPricing,
} from '../../../shared/pos/settings';
import { createReceiptSnapshot } from '../../../shared/receipts';

export default function RetailCreateOrderView({
  currentUser,
}: {
  currentUser: { email: string; role: string } | null;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const inventoryQuery = useRetailInventoryRecordsQuery();
  const salesQuery = useRetailSalesQuery();
  const locationsQuery = useRetailLocationsQuery();
  const createPOSOrderMutation = useCreateRetailPOSOrderMutation();
  const completePOSOrderPaymentMutation = useCompleteRetailPOSOrderPaymentMutation();
  const refundSaleMutation = useRefundRetailSaleMutation();
  const posSettingsQuery = usePOSSettingsQuery({ module: 'RETAIL' });
  const inventory = inventoryQuery.data ?? [];
  const sales = salesQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const loading = inventoryQuery.isLoading || salesQuery.isLoading || locationsQuery.isLoading;
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'history' | 'returns'>('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const cart = usePOSCart();
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any | null>(null);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const pricingSettings = useMemo(
    () => getPOSPricing(posSettingsQuery.data ?? []),
    [posSettingsQuery.data],
  );
  const paymentSettings = useMemo(
    () => getPOSPayments(posSettingsQuery.data ?? []),
    [posSettingsQuery.data],
  );
  const availablePaymentMethods = paymentSettings.methods.length > 0
    ? paymentSettings.methods
    : ['Cash'];

  useEffect(() => {
    if (!availablePaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0] ?? 'Cash');
    }
  }, [availablePaymentMethods, paymentMethod]);

  const availableItems = inventory.filter((item: any) => item.quantity > 0);
  const availableCategories = Array.from(new Set(availableItems.map((item: any) => item.category))).sort() as string[];

  const filteredInventory = availableItems.filter((item: any) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subcategory ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const subtotal = cart.totals.subtotal;
  const discount = cart.totals.discount;
  const total = cart.totals.total;
  const change = amountPaid - total;

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

  const handleAddToCart = (item: any) => {
    const existing = cart.items.find(c => c.inventoryItemId === item.id);
    if (existing) {
      if (existing.quantity >= item.quantity) { alert('Insufficient stock!'); return; }
      cart.addItem({ inventoryItemId: item.id, name: item.name, category: item.category, unitPrice: item.price, availableStock: item.quantity });
    } else {
      cart.addItem({ inventoryItemId: item.id, name: item.name, category: item.category, unitPrice: item.price, availableStock: item.quantity });
    }
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    const cartItem = cart.items.find(c => c.id === id);
    if (!cartItem) return;
    if (qty <= 0) { cart.removeItem(id); return; }
    if (typeof cartItem.availableStock === 'number' && qty > cartItem.availableStock) { alert('Cannot exceed available stock!'); return; }
    cart.updateQuantity(id, qty);
  };

  const handleClearCart = () => { cart.clear(); setAmountPaid(0); };

  const handleProcessPayment = async () => {
    if (cart.items.length === 0) { alert('Cart is empty!'); return; }
    if (!selectedLocationId) { alert('Please select a location first'); return; }
    if (paymentMethod === 'Cash' && amountPaid < total) { alert('Insufficient payment amount!'); return; }
    setSaving(true);
    try {
      const order = await createPOSOrderMutation.mutateAsync(
        cart.createPOSOrderPayload({
          locationId: selectedLocationId,
          orderType: 'RETAIL',
          status: 'PENDING',
        }),
      );
      const paidOrder = await completePOSOrderPaymentMutation.mutateAsync({
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
            tax: cart.totals.tax,
            serviceCharge: cart.totals.serviceCharge,
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
    } catch (err: any) {
      alert(err.message ?? 'Failed to process POS payment');
    } finally {
      setSaving(false);
    }
  };

  const openLastThermalReceipt = () => {
    if (!lastReceipt?.id) return;
    const next = new URLSearchParams(searchParams);
    next.set('view', 'retail-thermal-receipt');
    next.set('receiptId', lastReceipt.id);
    next.delete('orderId');
    setSearchParams(next);
  };

  const handleProcessReturn = async (saleId: string) => {
    if (!returnReason.trim()) { alert('Please provide a reason for return'); return; }
    setSaving(true);
    try {
      await refundSaleMutation.mutateAsync({ id: saleId, reason: returnReason });
      setSelectedSaleForReturn(null);
      setReturnReason('');
    } catch (err: any) {
      alert(err.message ?? 'Failed to process return');
    } finally {
      setSaving(false);
    }
  };

  const todaySales = sales.filter((s: any) => {
    const saleDate = new Date(s.createdAt).toDateString();
    return saleDate === new Date().toDateString() && s.status === 'COMPLETED';
  });
  const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + s.total, 0);
  const lastPayment = lastTransaction?.payments?.[0];
  const lastReceipt = lastTransaction?.receipts?.[0];
  const lastTransactionNumber = lastTransaction?.sale?.transactionNumber ?? lastTransaction?.orderNumber;
  const lastPaymentMethod = lastPayment?.method ?? paymentMethod;
  const lastAmountPaid = lastPayment?.amountPaid ?? 0;
  const lastChange = lastPayment?.change ?? 0;
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading POS…</div>;
  }

  return (
    <>
      <div className="flex min-h-full bg-[#f8fafb] text-[#0f172a]">
        <section className="flex-1 px-10 py-6">
          <h1 className="mb-5 flex items-center gap-2 text-[22px] font-semibold leading-7 text-[#0f172a]">
            <ShoppingBag className="h-6 w-6 text-[#008967]" />
            Ukay-Ukay Products
          </h1>
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#94a3b8]" />
            <input type="text" placeholder="Search by name, color, or scan product code (e.g., UKY001)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-[42px] w-full rounded-[8px] border border-[#dfe5ec] bg-white py-2 pl-10 pr-4 text-[15px] outline-none placeholder:text-[#94a3b8] focus:border-[#008967]" />
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
                <button onClick={() => setSelectedCategory('all')} className={`rounded-[8px] px-4 py-2 text-[14px] font-semibold ${selectedCategory === 'all' ? 'bg-[#007a5e] text-white shadow-sm' : 'bg-white text-[#0f172a]'}`}>
                  All Items
                </button>
                {availableCategories.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`rounded-[8px] px-4 py-2 text-[14px] font-semibold ${selectedCategory === cat ? 'bg-[#007a5e] text-white shadow-sm' : 'bg-white text-[#0f172a]'}`}>
                    {cat}
                  </button>
                ))}
              </div>

            <div>
              {filteredInventory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[16px] text-muted-foreground font-medium">No items found</p>
                  <p className="text-[14px] text-muted-foreground mt-1">Try selecting a different category or adjusting your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredInventory.map((item: any) => (
                    <button key={item.id} onClick={() => handleAddToCart(item)} className="rounded-[8px] border border-[#dfe5ec] bg-white p-3 text-left transition-colors hover:border-[#008967] hover:bg-[#f3fbf8]">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[14px] font-medium text-foreground line-clamp-2">{item.name}</p>
                        {item.condition && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${item.condition === 'Excellent' ? 'bg-secondary/10 text-secondary' : item.condition === 'Good' ? 'bg-secondary/10 text-secondary' : item.condition === 'Fair' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                            {item.condition}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground mb-2">{item.category}{item.size ? ` • Size ${item.size}` : ''}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-[18px] font-bold text-secondary">₱{item.price}</p>
                        <p className="text-[12px] text-muted-foreground">Stock: {item.quantity}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
        </section>

        <aside className="flex h-screen w-[320px] shrink-0 flex-col border-l border-[#e7edf3] bg-white px-5 py-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[#008967]" />
                  <h3 className="text-[16px] font-medium text-[#0f172a]">Shopping Cart</h3>
                </div>
                {cart.items.length > 0 && <button onClick={handleClearCart} className="text-destructive text-[12px] font-medium hover:underline">Clear All</button>}
              </div>

              <div className="mb-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
                {cart.items.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="size-12 text-muted mx-auto mb-2" />
                    <p className="text-muted-foreground text-[14px]">Cart is empty</p>
                  </div>
                ) : (
                  cart.items.map(item => (
                    <div key={item.id} className="border border-border rounded-[8px] p-3">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[13px] font-medium text-foreground flex-1">{item.name}</p>
                        <button onClick={() => cart.removeItem(item.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded"><Trash2 className="size-3" /></button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="size-6 rounded bg-muted hover:bg-muted flex items-center justify-center text-foreground font-bold">-</button>
                          <span className="text-[14px] font-medium text-foreground min-w-[20px] text-center">{item.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="size-6 rounded bg-muted hover:bg-muted flex items-center justify-center text-foreground font-bold">+</button>
                        </div>
                        <p className="text-[14px] font-bold text-secondary">₱{item.totalPrice}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.items.length > 0 && (
                <>
                  <div className="mb-3">
                    <label className="block text-[12px] font-medium text-muted-foreground mb-1">Customer (Optional)</label>
                    <input type="text" value={cart.customer.name ?? ''} onChange={(e) => cart.setCustomer({ ...cart.customer, name: e.target.value })} placeholder="Customer name" className="w-full px-3 py-2 border border-border rounded-[6px] text-[13px] focus:outline-none focus:border-secondary" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[12px] font-medium text-muted-foreground mb-1">Discount (₱)</label>
                    <input type="number" value={cart.discount} onChange={(e) => cart.setDiscount(Number(e.target.value))} min="0" max={subtotal} className="w-full px-3 py-2 border border-border rounded-[6px] text-[13px] focus:outline-none focus:border-secondary" />
                  </div>
                </>
              )}

              <div className="border-t border-border pt-3 mb-4 space-y-2">
                <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium text-foreground">₱{subtotal.toLocaleString()}</span></div>
                {discount > 0 && <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Discount:</span><span className="font-medium text-destructive">-₱{discount.toLocaleString()}</span></div>}
                {cart.totals.tax > 0 && <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Tax:</span><span className="font-medium text-foreground">₱{cart.totals.tax.toLocaleString()}</span></div>}
                {cart.totals.serviceCharge > 0 && <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Service:</span><span className="font-medium text-foreground">₱{cart.totals.serviceCharge.toLocaleString()}</span></div>}
                <div className="flex justify-between text-[18px] font-bold pt-2 border-t border-border"><span className="text-foreground">Total:</span><span className="text-secondary">₱{total.toLocaleString()}</span></div>
              </div>

              <button onClick={() => { if (cart.items.length > 0) { setAmountPaid(paymentMethod === 'Cash' ? Math.ceil(total / 100) * 100 : total); setShowPaymentModal(true); } }} disabled={cart.items.length === 0} className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#007a5e] px-4 text-[14px] font-bold text-white transition-colors hover:bg-[#00634d] disabled:cursor-not-allowed disabled:bg-[#e2e8f0] disabled:text-[#94a3b8]">
                <CreditCard className="size-5" />
                Proceed to Payment
              </button>
        </aside>
      </div>

      {/* Transaction History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white border border-border rounded-[14px] p-6">
          {sales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sales recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {sales.slice(0, 50).map((sale: any) => (
                <div key={sale.id} className="border border-border rounded-[8px] p-4 hover:bg-muted">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[16px] font-bold text-foreground">{sale.transactionNumber}</p>
                      <p className="text-[13px] text-muted-foreground">{new Date(sale.createdAt).toLocaleString()} • {sale.cashier?.name ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-bold text-secondary">₱{sale.total.toLocaleString()}</p>
                      <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${sale.status === 'COMPLETED' ? 'bg-secondary/10 text-secondary' : sale.status === 'REFUNDED' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                    <span>{sale.items?.length ?? 0} item(s)</span>
                    <span>•</span>
                    <span>{sale.paymentMethod}</span>
                    {sale.customer && <><span>•</span><span>{sale.customer}</span></>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === 'returns' && (
        <div className="bg-white border border-border rounded-[14px] p-6">
          <p className="text-[14px] text-muted-foreground mb-4">Process returns for completed sales (Admin/Manager only)</p>
          {sales.filter((s: any) => s.status === 'COMPLETED').length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No completed sales available for returns.</p>
          ) : (
            <div className="space-y-3">
              {sales.filter((s: any) => s.status === 'COMPLETED').slice(0, 20).map((sale: any) => (
                <div key={sale.id} className="border border-border rounded-[8px] p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[16px] font-bold text-foreground">{sale.transactionNumber}</p>
                      <p className="text-[13px] text-muted-foreground">{new Date(sale.createdAt).toLocaleString()}</p>
                      <p className="text-[13px] text-muted-foreground">Items: {sale.items?.map((i: any) => i.name).join(', ')}</p>
                    </div>
                    <p className="text-[18px] font-bold text-secondary">₱{sale.total.toLocaleString()}</p>
                  </div>
                  {selectedSaleForReturn === sale.id ? (
                    <div>
                      <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Reason for return..." className="w-full px-3 py-2 border border-border rounded-[6px] text-[13px] focus:outline-none focus:border-secondary mb-2 resize-none" rows={2} />
                      <div className="flex gap-2">
                        <button onClick={() => handleProcessReturn(sale.id)} disabled={saving} className="flex-1 bg-destructive text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-destructive disabled:opacity-60">{saving ? 'Processing…' : 'Confirm Return'}</button>
                        <button onClick={() => { setSelectedSaleForReturn(null); setReturnReason(''); }} className="flex-1 bg-muted text-foreground px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-muted">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setSelectedSaleForReturn(sale.id)} disabled={currentUser?.role === 'Staff'} className="w-full bg-warning text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-warning disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      <RotateCcw className="size-4" /> Process Return
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-md w-full">
            <h3 className="text-[20px] font-bold text-foreground mb-4">Payment</h3>
            <div className="mb-4">
              <p className="text-[14px] text-muted-foreground mb-1">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {availablePaymentMethods.map(method => (
                  <button key={method} onClick={() => { setPaymentMethod(method); setAmountPaid(method === 'Cash' ? Math.ceil(total / 100) * 100 : total); }} className={`px-4 py-2 rounded-[6px] text-[13px] font-medium border ${paymentMethod === method ? 'bg-secondary text-white border-secondary' : 'bg-white text-foreground border-border hover:border-secondary'}`}>
                    {method}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-[8px] p-4 mb-4">
              <div className="flex justify-between mb-2"><span className="text-[14px] text-muted-foreground">Total Amount:</span><span className="text-[18px] font-bold text-secondary">₱{total.toLocaleString()}</span></div>
            </div>
            {paymentMethod === 'Cash' && (
              <>
                <div className="mb-4">
                  <label className="block text-[14px] font-medium text-foreground mb-2">Amount Paid</label>
                  <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} min={total} step={50} className="w-full px-4 py-2 border border-border rounded-[6px] text-[16px] font-medium focus:outline-none focus:border-secondary" />
                </div>
                {amountPaid >= total && (
                  <div className="bg-secondary/10 rounded-[8px] p-4 mb-4">
                    <div className="flex justify-between"><span className="text-[14px] text-secondary font-medium">Change:</span><span className="text-[20px] font-bold text-secondary">₱{change.toLocaleString()}</span></div>
                  </div>
                )}
              </>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 bg-muted text-foreground px-4 py-3 rounded-[8px] font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleProcessPayment} disabled={saving || (paymentMethod === 'Cash' && amountPaid < total)} className="flex-1 bg-secondary text-white px-4 py-3 rounded-[8px] font-medium hover:bg-secondary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed">
                {saving ? 'Processing…' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastTransaction && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <CheckCircle className="size-16 text-success mx-auto mb-3" />
              <h3 className="text-[24px] font-bold text-foreground">Sale Completed!</h3>
              <p className="text-[14px] text-muted-foreground">{lastTransactionNumber}</p>
              {lastReceipt?.receiptNumber && (
                <p className="text-[12px] text-muted-foreground">{lastReceipt.receiptNumber}</p>
              )}
            </div>
            {lastReceiptSnapshot && (
              <div className="mb-4">
                <RetailThermalReceipt receipt={lastReceiptSnapshot} issuedAt={lastTransaction.createdAt} />
              </div>
            )}
            <div className="hidden">
              <p className="text-[12px] text-muted-foreground mb-2">{new Date(lastTransaction.createdAt).toLocaleString()}</p>
              <div className="space-y-1 mb-3">
                {lastTransaction.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[13px]">
                    <span className="text-foreground">{item.name} x{item.quantity}</span>
                    <span className="font-medium text-foreground">₱{item.totalPrice}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 space-y-1">
                <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Subtotal:</span><span className="text-foreground">₱{lastTransaction.subtotal.toLocaleString()}</span></div>
                {lastTransaction.discount > 0 && <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Discount:</span><span className="text-destructive">-₱{lastTransaction.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-[16px] font-bold pt-2 border-t border-border"><span className="text-foreground">Total:</span><span className="text-secondary">₱{lastTransaction.total.toLocaleString()}</span></div>
                <div className="flex justify-between text-[13px] pt-2"><span className="text-muted-foreground">Payment:</span><span className="text-foreground">{lastPaymentMethod}</span></div>
                {lastPaymentMethod === 'Cash' && (
                  <>
                    <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Cash:</span><span className="text-foreground">₱{lastTransaction.amountPaid.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Change:</span><span className="text-foreground">₱{lastTransaction.change.toLocaleString()}</span></div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReceiptModal(false)} className="flex-1 bg-muted text-foreground px-4 py-3 rounded-[8px] font-medium hover:bg-muted">Done</button>
              <button onClick={openLastThermalReceipt} disabled={!lastReceipt?.id} className="inline-flex flex-1 items-center justify-center gap-2 border border-border text-foreground px-4 py-3 rounded-[8px] font-medium hover:border-secondary disabled:opacity-50">
                <Receipt className="size-4" />
                Open
              </button>
              <button onClick={() => window.print()} className="inline-flex flex-1 items-center justify-center gap-2 bg-secondary text-white px-4 py-3 rounded-[8px] font-medium hover:bg-secondary">
                <Printer className="size-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
