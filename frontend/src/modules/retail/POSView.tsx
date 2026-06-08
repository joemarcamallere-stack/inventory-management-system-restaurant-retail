import { useState } from 'react';
import { Plus, X, Search, ShoppingCart, CreditCard, Trash2, CheckCircle, XCircle, Receipt, DollarSign, RotateCcw } from 'lucide-react';
import type { Sale, InventoryItem } from '../../app/utils/generateSampleData';

export default function POSView({
  sales,
  setSales,
  inventory,
  setInventory,
  currentUser
}: {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  currentUser: { email: string; role: string } | null;
}) {
  const [activeTab, setActiveTab] = useState<'sales' | 'history' | 'returns'>('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<{
    itemId: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    availableStock: number;
  }[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash' | 'Card' | 'Bank Transfer'>('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Sale | null>(null);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');

  // Get available items (in stock only)
  const availableItems = inventory.filter(item => item.quantity > 0);

  // Get unique categories from available items
  const availableCategories = Array.from(new Set(availableItems.map(item => item.category))).sort();

  // Filter inventory by category and search term
  const filteredInventory = availableItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.subcategory.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = 0; // No tax for ukay-ukay
  const total = subtotal - discount + tax;
  const change = amountPaid - total;

  const handleAddToCart = (item: InventoryItem) => {
    const existingItem = cart.find(c => c.itemId === item.id);

    if (existingItem) {
      if (existingItem.quantity >= item.quantity) {
        alert('Cannot add more. Insufficient stock!');
        return;
      }
      setCart(cart.map(c =>
        c.itemId === item.id
          ? {
              ...c,
              quantity: c.quantity + 1,
              totalPrice: (c.quantity + 1) * c.unitPrice
            }
          : c
      ));
    } else {
      setCart([...cart, {
        itemId: item.id,
        name: item.name,
        category: item.category,
        quantity: 1,
        unitPrice: item.price,
        totalPrice: item.price,
        availableStock: item.quantity
      }]);
    }
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    const cartItem = cart.find(c => c.itemId === itemId);
    if (!cartItem) return;

    if (newQuantity <= 0) {
      setCart(cart.filter(c => c.itemId !== itemId));
      return;
    }

    if (newQuantity > cartItem.availableStock) {
      alert('Cannot exceed available stock!');
      return;
    }

    setCart(cart.map(c =>
      c.itemId === itemId
        ? { ...c, quantity: newQuantity, totalPrice: newQuantity * c.unitPrice }
        : c
    ));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.itemId !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomer('');
    setAmountPaid(0);
  };

  const handleProcessPayment = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    if (paymentMethod === 'Cash' && amountPaid < total) {
      alert('Insufficient payment amount!');
      return;
    }

    // Create sale transaction
    const now = new Date();
    const newSale: Sale = {
      id: Date.now().toString(),
      transactionNumber: `TXN-2026-${String(sales.length + 1).padStart(4, '0')}`,
      date: now.toISOString().split('T')[0],
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      cashier: currentUser?.email.split('@')[0] || 'Unknown',
      location: 'Main Store',
      items: cart,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      amountPaid: paymentMethod === 'Cash' ? amountPaid : total,
      change: paymentMethod === 'Cash' ? change : 0,
      customer: customer || undefined,
      status: 'Completed'
    };

    // Update inventory
    const updatedInventory = inventory.map(item => {
      const cartItem = cart.find(c => c.itemId === item.id);
      if (cartItem) {
        return { ...item, quantity: item.quantity - cartItem.quantity };
      }
      return item;
    });

    setSales([newSale, ...sales]);
    setInventory(updatedInventory);
    setLastTransaction(newSale);
    handleClearCart();
    setShowPaymentModal(false);
    setShowReceiptModal(true);
  };

  const handleProcessReturn = (saleId: string) => {
    if (!returnReason.trim()) {
      alert('Please provide a reason for return');
      return;
    }

    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    // Update sale status
    setSales(sales.map(s =>
      s.id === saleId
        ? { ...s, status: 'Refunded' as const, refundReason: returnReason }
        : s
    ));

    // Return items to inventory
    const updatedInventory = inventory.map(item => {
      const saleItem = sale.items.find(si => si.itemId === item.id);
      if (saleItem) {
        return { ...item, quantity: item.quantity + saleItem.quantity };
      }
      return item;
    });

    setInventory(updatedInventory);
    setSelectedSaleForReturn(null);
    setReturnReason('');
    alert('Return processed successfully!');
  };

  const todaySales = sales.filter(s => s.date === new Date().toISOString().split('T')[0] && s.status === 'Completed');
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayTransactions = todaySales.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[30px] font-bold text-[#323B42]">Point of Sale</h2>
        <p className="text-[#6b7280] text-[14px] mt-1">Process sales transactions and manage returns</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[rgba(0,0,0,0.1)]">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-[#007A5E] text-[#007A5E]'
              : 'border-transparent text-[#6b7280] hover:text-[#323B42]'
          }`}
        >
          <ShoppingCart className="inline-block size-4 mr-2" />
          Sales
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-[#007A5E] text-[#007A5E]'
              : 'border-transparent text-[#6b7280] hover:text-[#323B42]'
          }`}
        >
          <Receipt className="inline-block size-4 mr-2" />
          Transaction History
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${
            activeTab === 'returns'
              ? 'border-[#007A5E] text-[#007A5E]'
              : 'border-transparent text-[#6b7280] hover:text-[#323B42]'
          }`}
        >
          <RotateCcw className="inline-block size-4 mr-2" />
          Returns
        </button>
      </div>

      {/* Sales Tab */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Product Search & Selection */}
          <div className="col-span-2">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#E0F5F1] border border-[rgba(0,122,94,0.2)] rounded-[12px] p-4">
                <p className="text-[14px] text-[#007A5E] font-medium">Today's Sales</p>
                <p className="text-[28px] font-bold text-[#007A5E] mt-1">â‚±{todayRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[12px] p-4">
                <p className="text-[14px] text-[#6b7280] font-medium">Transactions</p>
                <p className="text-[28px] font-bold text-[#323B42] mt-1">{todayTransactions}</p>
              </div>
              <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[12px] p-4">
                <p className="text-[14px] text-[#6b7280] font-medium">Avg. Sale</p>
                <p className="text-[28px] font-bold text-[#323B42] mt-1">
                  â‚±{todayTransactions > 0 ? Math.round(todayRevenue / todayTransactions).toLocaleString() : 0}
                </p>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="mb-4 bg-white border border-[rgba(0,0,0,0.1)] rounded-[12px] p-4">
              <p className="text-[12px] font-medium text-[#323B42] mb-3">Filter by Category:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-[#007A5E] text-white shadow-md'
                      : 'bg-[#F8FAFB] text-[#323B42] hover:bg-[#e9ecef]'
                  }`}
                >
                  All Items ({availableItems.length})
                </button>
                {availableCategories.map(category => {
                  const count = availableItems.filter(item => item.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                        selectedCategory === category
                          ? 'bg-[#007A5E] text-white shadow-md'
                          : 'bg-[#F8FAFB] text-[#323B42] hover:bg-[#e9ecef]'
                      }`}
                    >
                      {category} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] size-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
              />
            </div>

            {/* Product Grid */}
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4 max-h-[600px] overflow-y-auto">
              {filteredInventory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[16px] text-[#6b7280] font-medium">No items found</p>
                  <p className="text-[14px] text-[#9ca3af] mt-1">Try selecting a different category or adjusting your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredInventory.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className="text-left border border-[rgba(0,0,0,0.1)] rounded-[8px] p-3 hover:border-[#007A5E] hover:bg-[#F8FAFB] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[14px] font-medium text-[#323B42] line-clamp-2">{item.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.condition === 'Excellent' ? 'bg-[#E0F5F1] text-[#008967]' :
                        item.condition === 'Good' ? 'bg-[#E0F2F2] text-[#007A5E]' :
                        item.condition === 'Fair' ? 'bg-[#fef3c6] text-[#92400e]' :
                        'bg-[#ffe2e2] text-[#991b1b]'
                      }`}>
                        {item.condition}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6b7280] mb-2">{item.category} â€¢ Size {item.size}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[18px] font-bold text-[#007A5E]">â‚±{item.price}</p>
                      <p className="text-[12px] text-[#6b7280]">Stock: {item.quantity}</p>
                    </div>
                  </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4 sticky top-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-bold text-[#323B42]">Current Sale</h3>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[#E7000B] text-[12px] font-medium hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="size-12 text-[#E5E7EB] mx-auto mb-2" />
                    <p className="text-[#6b7280] text-[14px]">Cart is empty</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.itemId} className="border border-[rgba(0,0,0,0.1)] rounded-[8px] p-3">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[13px] font-medium text-[#323B42] flex-1">{item.name}</p>
                        <button
                          onClick={() => handleRemoveFromCart(item.itemId)}
                          className="text-[#E7000B] hover:bg-[#ffe2e2] p-1 rounded"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.itemId, item.quantity - 1)}
                            className="size-6 rounded bg-[#F8FAFB] hover:bg-[#E5E7EB] flex items-center justify-center text-[#323B42] font-bold"
                          >
                            -
                          </button>
                          <span className="text-[14px] font-medium text-[#323B42] min-w-[20px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.itemId, item.quantity + 1)}
                            className="size-6 rounded bg-[#F8FAFB] hover:bg-[#E5E7EB] flex items-center justify-center text-[#323B42] font-bold"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-[14px] font-bold text-[#007A5E]">â‚±{item.totalPrice}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Discount & Customer */}
              {cart.length > 0 && (
                <>
                  <div className="mb-3">
                    <label className="block text-[12px] font-medium text-[#6b7280] mb-1">Customer (Optional)</label>
                    <input
                      type="text"
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      placeholder="Customer name"
                      className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[13px] focus:outline-none focus:border-[#007A5E]"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[12px] font-medium text-[#6b7280] mb-1">Discount (â‚±)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      min="0"
                      max={subtotal}
                      className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[13px] focus:outline-none focus:border-[#007A5E]"
                    />
                  </div>
                </>
              )}

              {/* Totals */}
              <div className="border-t border-[rgba(0,0,0,0.1)] pt-3 mb-4 space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b7280]">Subtotal:</span>
                  <span className="font-medium text-[#323B42]">â‚±{subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6b7280]">Discount:</span>
                    <span className="font-medium text-[#E7000B]">-â‚±{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-[18px] font-bold pt-2 border-t border-[rgba(0,0,0,0.1)]">
                  <span className="text-[#323B42]">Total:</span>
                  <span className="text-[#007A5E]">â‚±{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  if (cart.length > 0) {
                    setAmountPaid(paymentMethod === 'Cash' ? Math.ceil(total / 100) * 100 : total);
                    setShowPaymentModal(true);
                  }
                }}
                disabled={cart.length === 0}
                className="w-full bg-[#007A5E] text-white py-3 rounded-[8px] font-bold text-[16px] hover:bg-[#008967] transition-colors disabled:bg-[#E5E7EB] disabled:text-[#6b7280] disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard className="size-5" />
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <div className="space-y-3">
            {sales.slice(0, 50).map(sale => (
              <div key={sale.id} className="border border-[rgba(0,0,0,0.1)] rounded-[8px] p-4 hover:bg-[#F8FAFB] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[16px] font-bold text-[#323B42]">{sale.transactionNumber}</p>
                    <p className="text-[13px] text-[#6b7280]">{sale.date} â€¢ {sale.time} â€¢ {sale.cashier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-[#007A5E]">â‚±{sale.total.toLocaleString()}</p>
                    <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                      sale.status === 'Completed' ? 'bg-[#E0F5F1] text-[#008967]' :
                      sale.status === 'Refunded' ? 'bg-[#ffe2e2] text-[#991b1b]' :
                      'bg-[#fef3c6] text-[#92400e]'
                    }`}>
                      {sale.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[12px] text-[#6b7280]">
                  <span>{sale.items.length} item(s)</span>
                  <span>â€¢</span>
                  <span>{sale.paymentMethod}</span>
                  {sale.customer && (
                    <>
                      <span>â€¢</span>
                      <span>{sale.customer}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === 'returns' && (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <p className="text-[14px] text-[#6b7280] mb-4">Process returns for completed sales (Admin/Manager only)</p>
          <div className="space-y-3">
            {sales.filter(s => s.status === 'Completed').slice(0, 20).map(sale => (
              <div key={sale.id} className="border border-[rgba(0,0,0,0.1)] rounded-[8px] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[16px] font-bold text-[#323B42]">{sale.transactionNumber}</p>
                    <p className="text-[13px] text-[#6b7280]">{sale.date} â€¢ {sale.time}</p>
                    <p className="text-[13px] text-[#6b7280]">Items: {sale.items.map(i => i.name).join(', ')}</p>
                  </div>
                  <p className="text-[18px] font-bold text-[#007A5E]">â‚±{sale.total.toLocaleString()}</p>
                </div>

                {selectedSaleForReturn === sale.id ? (
                  <div>
                    <textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="Reason for return..."
                      className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[13px] focus:outline-none focus:border-[#007A5E] mb-2 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleProcessReturn(sale.id)}
                        className="flex-1 bg-[#E7000B] text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-[#D10000]"
                      >
                        Confirm Return
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSaleForReturn(null);
                          setReturnReason('');
                        }}
                        className="flex-1 bg-[#F8FAFB] text-[#323B42] px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-[#E5E7EB]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedSaleForReturn(sale.id)}
                    disabled={currentUser?.role === 'Staff'}
                    className="w-full bg-[#FFA500] text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-[#FF8C00] disabled:bg-[#E5E7EB] disabled:text-[#6b7280] disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="size-4" />
                    Process Return
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-md w-full">
            <h3 className="text-[20px] font-bold text-[#323B42] mb-4">Payment</h3>

            <div className="mb-4">
              <p className="text-[14px] text-[#6b7280] mb-1">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {(['Cash', 'GCash', 'Card', 'Bank Transfer'] as const).map(method => (
                  <button
                    key={method}
                    onClick={() => {
                      setPaymentMethod(method);
                      setAmountPaid(method === 'Cash' ? Math.ceil(total / 100) * 100 : total);
                    }}
                    className={`px-4 py-2 rounded-[6px] text-[13px] font-medium border ${
                      paymentMethod === method
                        ? 'bg-[#007A5E] text-white border-[#007A5E]'
                        : 'bg-white text-[#323B42] border-[rgba(0,0,0,0.1)] hover:border-[#007A5E]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#F8FAFB] rounded-[8px] p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-[14px] text-[#6b7280]">Total Amount:</span>
                <span className="text-[18px] font-bold text-[#007A5E]">â‚±{total.toLocaleString()}</span>
              </div>
            </div>

            {paymentMethod === 'Cash' && (
              <>
                <div className="mb-4">
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Amount Paid</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    min={total}
                    step={50}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[16px] font-medium focus:outline-none focus:border-[#007A5E]"
                  />
                </div>

                {amountPaid >= total && (
                  <div className="bg-[#E0F5F1] rounded-[8px] p-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-[14px] text-[#007A5E] font-medium">Change:</span>
                      <span className="text-[20px] font-bold text-[#007A5E]">â‚±{change.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-[#F8FAFB] text-[#323B42] px-4 py-3 rounded-[8px] font-medium hover:bg-[#E5E7EB]"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={paymentMethod === 'Cash' && amountPaid < total}
                className="flex-1 bg-[#007A5E] text-white px-4 py-3 rounded-[8px] font-medium hover:bg-[#008967] disabled:bg-[#E5E7EB] disabled:text-[#6b7280] disabled:cursor-not-allowed"
              >
                Complete Sale
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
              <CheckCircle className="size-16 text-[#00A63E] mx-auto mb-3" />
              <h3 className="text-[24px] font-bold text-[#323B42]">Sale Completed!</h3>
              <p className="text-[14px] text-[#6b7280]">{lastTransaction.transactionNumber}</p>
            </div>

            <div className="border border-[rgba(0,0,0,0.1)] rounded-[8px] p-4 mb-4">
              <p className="text-[12px] text-[#6b7280] mb-2">{lastTransaction.date} â€¢ {lastTransaction.time}</p>
              <div className="space-y-1 mb-3">
                {lastTransaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[13px]">
                    <span className="text-[#323B42]">{item.name} x{item.quantity}</span>
                    <span className="font-medium text-[#323B42]">â‚±{item.totalPrice}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[rgba(0,0,0,0.1)] pt-2 space-y-1">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6b7280]">Subtotal:</span>
                  <span className="text-[#323B42]">â‚±{lastTransaction.subtotal.toLocaleString()}</span>
                </div>
                {lastTransaction.discount > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6b7280]">Discount:</span>
                    <span className="text-[#E7000B]">-â‚±{lastTransaction.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-[16px] font-bold pt-2 border-t border-[rgba(0,0,0,0.1)]">
                  <span className="text-[#323B42]">Total:</span>
                  <span className="text-[#007A5E]">â‚±{lastTransaction.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[13px] pt-2">
                  <span className="text-[#6b7280]">Payment:</span>
                  <span className="text-[#323B42]">{lastTransaction.paymentMethod}</span>
                </div>
                {lastTransaction.paymentMethod === 'Cash' && (
                  <>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#6b7280]">Cash:</span>
                      <span className="text-[#323B42]">â‚±{lastTransaction.amountPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#6b7280]">Change:</span>
                      <span className="text-[#323B42]">â‚±{lastTransaction.change.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowReceiptModal(false)}
              className="w-full bg-[#007A5E] text-white px-4 py-3 rounded-[8px] font-medium hover:bg-[#008967]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
