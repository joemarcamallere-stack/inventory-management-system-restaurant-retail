import { useState } from 'react';
import { Plus, X, Search, Package, ShoppingCart, CheckCircle, XCircle, Clock, Eye, Users, Trash2 } from 'lucide-react';
import type { PurchaseOrder, InventoryItem, Supplier } from '../../app/utils/generateSampleData';
import { categorySubcategories } from '../../app/utils/constants';

export default function PurchaseOrdersView({ orders, setPurchaseOrders, inventory, setInventory, currentUser }: {
  orders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  currentUser: { email: string; role: string } | null;
}) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNewPOModal, setShowNewPOModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showSuppliersModal, setShowSuppliersModal] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showPendingApprovalsModal, setShowPendingApprovalsModal] = useState(false);
  const [selectedPOForAction, setSelectedPOForAction] = useState<string | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [poForm, setPOForm] = useState({
    supplier: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer' as 'Cash' | 'Bank Transfer' | 'Check' | 'Credit Terms',
    paymentTerms: '',
    items: [] as { name: string; quantity: number; price: number; category?: string; subcategory?: string; targetCustomer?: 'Male' | 'Female' | 'Unisex'; size?: string; condition?: string; baleType?: string; estimatedWeight?: number; isNew?: boolean }[]
  });
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: '',
    subcategory: '',
    newCategory: '',
    newSubcategory: '',
    targetCustomer: 'Unisex' as 'Male' | 'Female' | 'Unisex',
    size: '',
    condition: 'Good' as 'Excellent' | 'Good' | 'Fair' | 'Damaged',
    baleType: '',
    estimatedWeight: 0,
    quantity: 1,
    price: 0
  });

  const [showBaleTypeDropdown, setShowBaleTypeDropdown] = useState(false);

  // Common bale types in ukay-ukay businesses
  const baleTypeSuggestions = [
    'Mixed Clothing',
    'Ladies Tops',
    'Ladies Bottoms',
    'Ladies Dresses',
    "Men's Tops",
    "Men's Bottoms",
    "Men's Jeans",
    'Kids Wear - Mixed',
    'Kids Tops',
    'Kids Bottoms',
    'Premium Denim',
    'Vintage T-Shirts',
    'Designer Labels',
    'Mixed Accessories',
    'Shoes - Mixed',
    'Shoes - Sneakers',
    'Shoes - Formal',
    'Bags and Purses',
    'Jackets and Coats',
    'Winter Wear',
    'Summer Wear',
    'Activewear/Sportswear',
    'Formal Wear',
    'Casual Wear',
    'Underwear and Intimates',
    'Sleepwear',
    'Mixed Grade A',
    'Mixed Grade B',
    'Vintage Collection'
  ];

  const filteredBaleTypes = baleTypeSuggestions.filter(type =>
    type.toLowerCase().includes(newItemForm.baleType.toLowerCase())
  );


  const suppliers: Supplier[] = [
    {
      id: '1',
      name: 'Manila Vintage Traders',
      contactPerson: 'Maria Santos',
      email: 'maria@mvtraders.ph',
      phone: '+63 917 123 4567',
      address: 'Quezon City, Metro Manila',
      category: 'Clothing & Accessories'
    },
    {
      id: '2',
      name: 'Cebu Fashion Wholesale',
      contactPerson: 'Juan Dela Cruz',
      email: 'juan@cfwholesale.com',
      phone: '+63 922 987 6543',
      address: 'Cebu City, Cebu',
      category: 'Clothing'
    },
    {
      id: '3',
      name: 'Second Life Clothing Co.',
      contactPerson: 'Anna Reyes',
      email: 'anna@secondlife.ph',
      phone: '+63 915 456 7890',
      address: 'Makati City, Metro Manila',
      category: 'Pre-loved Fashion'
    },
    {
      id: '4',
      name: 'Davao Thrift Suppliers',
      contactPerson: 'Carlos Torres',
      email: 'carlos@davaothrift.ph',
      phone: '+63 920 234 5678',
      address: 'Davao City, Davao del Sur',
      category: 'Mixed Inventory'
    },
    {
      id: '5',
      name: 'Metro Shoe Distributors',
      contactPerson: 'Sofia Garcia',
      email: 'sofia@metroshoedist.com',
      phone: '+63 918 765 4321',
      address: 'Pasig City, Metro Manila',
      category: 'Footwear'
    },
    {
      id: '6',
      name: 'Baguio Apparel Source',
      contactPerson: 'Miguel Fernandez',
      email: 'miguel@baguioapparel.ph',
      phone: '+63 919 876 5432',
      address: 'Baguio City, Benguet',
      category: 'Jackets & Outerwear'
    },
    {
      id: '7',
      name: 'Quality Thrift Hub',
      contactPerson: 'Liza Mendoza',
      email: 'liza@qthub.ph',
      phone: '+63 921 345 6789',
      address: 'Mandaluyong City, Metro Manila',
      category: 'General Merchandise'
    }
  ];

  const filteredOrders = orders.filter(order =>
    filterStatus === 'all' || order.status === filterStatus
  );

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    approved: orders.filter(o => o.status === 'Approved').length,
    received: orders.filter(o => o.status === 'Received').length
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(poForm.supplier.toLowerCase())
  );

  const handleAddItemToPO = () => {
    if (!newItemForm.baleType || !newItemForm.quantity || !newItemForm.price || !newItemForm.estimatedWeight) {
      alert('Please fill in all required fields: Bale Type, Quantity, Unit Cost, and Estimated Weight');
      return;
    }

    const finalCategory = newItemForm.newCategory || newItemForm.category;
    const finalSubcategory = newItemForm.newSubcategory || newItemForm.subcategory;

    const newItem = {
      name: newItemForm.baleType, // Use baleType as the item name
      quantity: newItemForm.quantity,
      price: newItemForm.price,
      category: finalCategory || 'General',
      subcategory: finalSubcategory || 'Mixed',
      targetCustomer: newItemForm.targetCustomer,
      size: 'Mixed', // Bales contain mixed sizes
      condition: newItemForm.condition,
      baleType: newItemForm.baleType,
      estimatedWeight: newItemForm.estimatedWeight,
      isNew: true
    };

    setPOForm({
      ...poForm,
      items: [...poForm.items, newItem]
    });

    setNewItemForm({
      name: '',
      category: '',
      subcategory: '',
      newCategory: '',
      newSubcategory: '',
      targetCustomer: 'Unisex',
      size: '',
      condition: 'Good',
      baleType: '',
      estimatedWeight: 0,
      quantity: 1,
      price: 0
    });
    setShowNewItemModal(false);
  };

  const handleCreatePO = () => {
    if (!poForm.supplier || poForm.items.length === 0) {
      alert('Please fill in supplier and add at least one item');
      return;
    }

    const totalAmount = poForm.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const newPO: PurchaseOrder = {
      id: Date.now().toString(),
      orderNumber: `PO-2026-${String(orders.length + 1).padStart(3, '0')}`,
      supplier: poForm.supplier,
      date: poForm.date,
      status: 'Pending',
      items: poForm.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount,
      paymentMethod: poForm.paymentMethod,
      paymentTerms: poForm.paymentTerms || undefined
    };

    setPurchaseOrders([...orders, newPO]);

    // Add new items to inventory with 0 quantity (will be updated when received)
    const newInventoryItems = poForm.items
      .filter(item => item.isNew)
      .map(item => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        name: item.name,
        category: item.category || 'Uncategorized',
        subcategory: item.subcategory || 'Other',
        targetCustomer: item.targetCustomer || 'Unisex',
        size: item.size || 'One Size',
        condition: (item.condition || 'Good') as 'Excellent' | 'Good' | 'Fair' | 'Damaged',
        quantity: 0,
        price: item.price,
        dateAdded: new Date().toISOString().split('T')[0],
        location: 'Warehouse'
      }));

    if (newInventoryItems.length > 0) {
      setInventory([...inventory, ...newInventoryItems]);
    }

    setPOForm({
      supplier: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      paymentTerms: '',
      items: []
    });
    setShowNewPOModal(false);
  };

  const handleApprovePO = (poId: string) => {
    setPurchaseOrders(orders.map(po =>
      po.id === poId ? { ...po, status: 'Approved' as const } : po
    ));
    setSelectedPOForAction(null);
  };

  const handleRejectPO = (poId: string) => {
    if (!rejectionRemarks.trim()) {
      alert('Please provide remarks for rejection');
      return;
    }

    setPurchaseOrders(orders.map(po =>
      po.id === poId ? { ...po, status: 'Cancelled' as const } : po
    ));
    setRejectionRemarks('');
    setSelectedPOForAction(null);
  };

  const pendingApprovalPOs = orders.filter(po => po.status === 'Pending');
  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">Purchase Orders</h2>
          <p className="text-[#323B42] text-[14px] mt-1">Create POs and register new items</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSuppliersModal(true)}
            className="bg-white border border-[rgba(0,0,0,0.1)] text-[#323B42] px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#F8FAFB] transition-colors"
          >
            <Users className="size-4" />
            View Suppliers
          </button>
          {isAdmin && pendingApprovalPOs.length > 0 && (
            <button
              onClick={() => setShowPendingApprovalsModal(true)}
              className="bg-[#FFA500] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#FF8C00] transition-colors relative"
            >
              <Clock className="size-4" />
              Pending Approvals
              <span className="absolute -top-2 -right-2 bg-[#E7000B] text-white size-6 rounded-full flex items-center justify-center text-[12px] font-bold">
                {pendingApprovalPOs.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowNewPOModal(true)}
            className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#008967] transition-colors"
          >
            <Plus className="size-4" />
            New Purchase Order
          </button>
        </div>
      </div>

      {/* New PO Modal */}
      {showNewPOModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#f8fafb] rounded-[12px] p-6 max-w-[512px] w-full max-h-[90vh] overflow-y-auto border border-[rgba(50,59,66,0.15)] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-[18px] font-semibold text-[#003534] font-['Poppins',sans-serif]">Create Purchase Order</h3>
                <p className="text-[14px] text-[#323b42] mt-1">Create a new purchase order for bale deliveries</p>
              </div>
              <button
                onClick={() => setShowNewPOModal(false)}
                className="p-2 hover:bg-[rgba(0,0,0,0.05)] rounded-[6px] transition-colors opacity-70"
              >
                <X className="size-4 text-[#323B42]" />
              </button>
            </div>

            <div className="space-y-4 mt-6">
              <div className="relative">
                <label className="block text-[12px] font-medium text-[#323b42] mb-2">Supplier *</label>
                <input
                  type="text"
                  value={poForm.supplier}
                  onChange={(e) => {
                    setPOForm({ ...poForm, supplier: e.target.value });
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 300)}
                  className="w-full px-[12.8px] py-[8.8px] bg-white border-[0.8px] border-transparent rounded-[10px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  placeholder="Select supplier"
                />
                {showSupplierDropdown && filteredSuppliers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[rgba(50,59,66,0.15)] rounded-[10px] shadow-lg max-h-[240px] overflow-y-auto">
                    {filteredSuppliers.map(supplier => (
                      <div
                        key={supplier.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setPOForm({ ...poForm, supplier: supplier.name });
                          setShowSupplierDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-[#f8fafb] cursor-pointer border-b border-[rgba(50,59,66,0.1)] last:border-b-0"
                      >
                        <p className="text-[14px] font-medium text-[#323b42]">{supplier.name}</p>
                        <p className="text-[12px] text-[#6b7280] mt-0.5">{supplier.category} â€¢ {supplier.contactPerson}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#323b42] mb-2">Date</label>
                <input
                  type="date"
                  value={poForm.date}
                  onChange={(e) => setPOForm({ ...poForm, date: e.target.value })}
                  className="w-full px-[12.8px] py-[8.8px] bg-white border-[0.8px] border-transparent rounded-[10px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#323b42] mb-2">Payment Method *</label>
                <select
                  value={poForm.paymentMethod}
                  onChange={(e) => setPOForm({ ...poForm, paymentMethod: e.target.value as any })}
                  className="w-full px-[12.8px] py-[8.8px] bg-white border-[0.8px] border-transparent rounded-[10px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Credit Terms">Credit Terms</option>
                </select>
              </div>

              {poForm.paymentMethod === 'Credit Terms' && (
                <div>
                  <label className="block text-[12px] font-medium text-[#323b42] mb-2">Payment Terms</label>
                  <input
                    type="text"
                    value={poForm.paymentTerms}
                    onChange={(e) => setPOForm({ ...poForm, paymentTerms: e.target.value })}
                    className="w-full px-[12.8px] py-[8.8px] bg-white border-[0.8px] border-transparent rounded-[10px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="e.g., Net 30 days"
                  />
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[16px] font-semibold text-[#323b42]">Bale Items</label>
                <button
                  onClick={() => setShowNewItemModal(true)}
                  className="px-[10.8px] py-[0.8px] h-[32px] bg-[#f8fafb] border-[0.8px] border-[rgba(50,59,66,0.15)] text-[#323b42] rounded-[10px] text-[14px] font-medium flex items-center gap-[6px] hover:bg-[#e9ecef] transition-colors"
                >
                  <Plus className="size-4" />
                  Add Item
                </button>
              </div>

              {poForm.items.length === 0 ? (
                <div className="bg-[#f9fafb] border-[0.8px] border-[rgba(50,59,66,0.15)] rounded-[12px] p-6 text-center">
                  <p className="text-[14px] text-[#323B42]">No items added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {poForm.items.map((item, idx) => (
                    <div key={idx} className="bg-[#f9fafb] border-[0.8px] border-[rgba(50,59,66,0.15)] rounded-[12px] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-[14px] font-semibold text-[#364153]">{item.name}</p>
                          <div className="flex gap-2 mt-1">
                            {item.isNew && <span className="text-[11px] bg-[#E0F5F1] text-[#008967] px-2 py-0.5 rounded">New Item</span>}
                            {item.baleType && <span className="text-[11px] bg-[#E0F2F2] text-[#007A5E] px-2 py-0.5 rounded">{item.baleType}</span>}
                          </div>
                          {item.estimatedWeight && item.estimatedWeight > 0 && (
                            <p className="text-[12px] text-[#6b7280] mt-1">Est. Weight: {item.estimatedWeight} kg</p>
                          )}
                        </div>
                        <button
                          onClick={() => setPOForm({ ...poForm, items: poForm.items.filter((_, i) => i !== idx) })}
                          className="text-[#E7000B] hover:bg-[#ffe2e2] p-1 rounded"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="border-t border-[rgba(50,59,66,0.15)] pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-[#6b7280]">
                            {item.quantity} qty Ã— â‚±{item.price.toLocaleString()}
                          </span>
                          <span className="text-[14px] font-semibold text-[#007a5e]">â‚±{(item.quantity * item.price).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 bg-[#f3f4f6] rounded-[12px] p-3 flex justify-between items-center">
              <span className="text-[16px] font-semibold text-[#323b42]">Total Order Cost:</span>
              <span className="text-[20px] font-bold text-[#007a5e]">
                â‚±{poForm.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()}
              </span>
            </div>

            <div className="mt-4">
              <label className="block text-[14px] font-medium text-[#323b42] mb-2">Notes</label>
              <input
                type="text"
                className="w-full px-[12.8px] py-[8.8px] bg-white border-[0.8px] border-transparent rounded-[10px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                placeholder="Additional notes or requirements"
              />
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setShowNewPOModal(false)}
                className="px-[16.8px] py-[8.8px] h-[36px] bg-[#f8fafb] border-[0.8px] border-[rgba(50,59,66,0.15)] rounded-[10px] text-[14px] font-medium text-[#323b42] hover:bg-[#e9ecef] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                className="px-4 py-2 h-[36px] bg-[#007a5e] text-white rounded-[10px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-[24px] font-bold text-[#323B42] mb-6">Add Item to Purchase Order</h3>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Bale Type *</label>
                <input
                  type="text"
                  value={newItemForm.baleType}
                  onChange={(e) => {
                    setNewItemForm({ ...newItemForm, baleType: e.target.value, name: e.target.value });
                    setShowBaleTypeDropdown(true);
                  }}
                  onFocus={() => setShowBaleTypeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowBaleTypeDropdown(false), 300)}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  placeholder="e.g., Mixed Clothing, Premium Denim, Ladies Tops"
                />
                {showBaleTypeDropdown && filteredBaleTypes.length > 0 && newItemForm.baleType && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] shadow-lg max-h-[240px] overflow-y-auto">
                    {filteredBaleTypes.map((type, index) => (
                      <div
                        key={index}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setNewItemForm({ ...newItemForm, baleType: type, name: type });
                          setShowBaleTypeDropdown(false);
                        }}
                        className="px-4 py-2.5 hover:bg-[#F8FAFB] cursor-pointer border-b border-[rgba(0,0,0,0.05)] last:border-b-0"
                      >
                        <p className="text-[14px] text-[#323B42]">{type}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Category *</label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value, subcategory: '', newCategory: '' })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  >
                    <option value="">Select or add new below</option>
                    {Object.keys(categorySubcategories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Or New Category</label>
                  <input
                    type="text"
                    value={newItemForm.newCategory}
                    onChange={(e) => setNewItemForm({ ...newItemForm, newCategory: e.target.value, category: '' })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="New category name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Subcategory *</label>
                  <select
                    value={newItemForm.subcategory}
                    onChange={(e) => setNewItemForm({ ...newItemForm, subcategory: e.target.value, newSubcategory: '' })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    disabled={!newItemForm.category}
                  >
                    <option value="">Select or add new below</option>
                    {newItemForm.category && categorySubcategories[newItemForm.category]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Or New Subcategory</label>
                  <input
                    type="text"
                    value={newItemForm.newSubcategory}
                    onChange={(e) => setNewItemForm({ ...newItemForm, newSubcategory: e.target.value, subcategory: '' })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="New subcategory name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Target Customer *</label>
                  <select
                    value={newItemForm.targetCustomer}
                    onChange={(e) => setNewItemForm({ ...newItemForm, targetCustomer: e.target.value as any })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unisex">Unisex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Estimated Weight (kg) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newItemForm.estimatedWeight}
                    onChange={(e) => setNewItemForm({ ...newItemForm, estimatedWeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Enter weight in kg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Condition</label>
                <select
                  value={newItemForm.condition}
                  onChange={(e) => setNewItemForm({ ...newItemForm, condition: e.target.value as any })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Quantity (Bales) *</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemForm.quantity}
                    onChange={(e) => setNewItemForm({ ...newItemForm, quantity: parseInt(e.target.value) || 1, size: 'Mixed' })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Number of bales"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Unit Cost per Bale (â‚±) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm({ ...newItemForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Cost per bale"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewItemModal(false);
                  setNewItemForm({
                    name: '',
                    category: '',
                    subcategory: '',
                    newCategory: '',
                    newSubcategory: '',
                    targetCustomer: 'Unisex',
                    size: '',
                    condition: 'Good',
                    baleType: '',
                    estimatedWeight: 0,
                    quantity: 1,
                    price: 0
                  });
                }}
                className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItemToPO}
                className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Modal */}
      {showSuppliersModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[24px] font-bold text-[#323B42]">Suppliers Directory</h3>
              <button
                onClick={() => setShowSuppliersModal(false)}
                className="p-2 hover:bg-[#F8FAFB] rounded-[6px] transition-colors"
              >
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            <div className="space-y-3">
              {suppliers.map(supplier => (
                <div key={supplier.id} className="bg-[#F8FAFB] border border-[rgba(0,0,0,0.1)] rounded-[12px] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-[18px] font-semibold text-[#323B42] mb-1">{supplier.name}</h4>
                      <span className="text-[12px] bg-[#E0F5F1] text-[#008967] px-2 py-1 rounded font-medium">
                        {supplier.category}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setPOForm({ ...poForm, supplier: supplier.name });
                        setShowSuppliersModal(false);
                        setShowNewPOModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#007A5E] text-white rounded-[6px] text-[13px] font-medium hover:bg-[#008967] transition-colors"
                    >
                      Create PO
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[12px] text-[#323B42] mb-1">Contact Person</p>
                      <p className="text-[14px] font-medium text-[#323B42]">{supplier.contactPerson}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#323B42] mb-1">Phone</p>
                      <p className="text-[14px] font-medium text-[#323B42]">{supplier.phone}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#323B42] mb-1">Email</p>
                      <p className="text-[14px] font-medium text-[#323B42]">{supplier.email}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-[#323B42] mb-1">Address</p>
                      <p className="text-[14px] font-medium text-[#323B42]">{supplier.address}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowSuppliersModal(false)}
                className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">Total Orders</p>
          <p className="text-[#323B42] text-[24px] font-bold">{stats.total}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">Pending</p>
          <p className="text-[#FFA500] text-[24px] font-bold">{stats.pending}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">Approved</p>
          <p className="text-[#007A5E] text-[24px] font-bold">{stats.approved}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">Received</p>
          <p className="text-[#008967] text-[24px] font-bold">{stats.received}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] mb-4 p-4">
        <div className="flex items-center gap-2">
          <label className="text-[14px] text-[#323B42] font-medium">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[14px] bg-white focus:outline-none focus:border-[#007A5E]"
          >
            <option value="all">All Orders</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-[18px] font-semibold text-[#323B42]">{order.orderNumber}</h3>
                  <span className={`px-2 py-1 rounded text-[12px] font-semibold ${
                    order.status === 'Pending' ? 'bg-[#fff4e6] text-[#FFA500]' :
                    order.status === 'Approved' ? 'bg-[#E0F2F2] text-[#007A5E]' :
                    order.status === 'Received' ? 'bg-[#E0F5F1] text-[#008967]' :
                    'bg-[#ffe2e2] text-[#E7000B]'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-[14px] text-[#323B42]">Supplier: <span className="font-medium text-[#323B42]">{order.supplier}</span></p>
                <p className="text-[14px] text-[#323B42]">Date: {order.date}</p>
              </div>
              <div className="text-right">
                <p className="text-[24px] font-bold text-[#323B42]">â‚±{order.totalAmount.toLocaleString()}</p>
                <p className="text-[12px] text-[#323B42]">Total Amount</p>
              </div>
            </div>

            <div className="border-t border-[rgba(0,0,0,0.1)] pt-4">
              <p className="text-[14px] font-medium text-[#323B42] mb-2">Items:</p>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[13px]">
                    <span className="text-[#323B42]">{item.name}</span>
                    <span className="text-[#323B42]">
                      {item.quantity} Ã— â‚±{item.price} = <span className="font-medium">â‚±{(item.quantity * item.price).toLocaleString()}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Approvals Modal */}
      {showPendingApprovalsModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[24px] font-bold text-[#323B42]">Pending Purchase Order Approvals</h3>
                <p className="text-[14px] text-[#6b7280] mt-1">Review and approve or reject POs created by staff</p>
              </div>
              <button
                onClick={() => {
                  setShowPendingApprovalsModal(false);
                  setSelectedPOForAction(null);
                  setRejectionRemarks('');
                }}
                className="text-[#6b7280] hover:text-[#323B42] transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>

            {pendingApprovalPOs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="size-16 text-[#00A63E] mx-auto mb-4" />
                <p className="text-[#323B42] text-[16px] font-medium">No pending approvals</p>
                <p className="text-[#6b7280] text-[14px] mt-1">All purchase orders have been reviewed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovalPOs.map(po => (
                  <div key={po.id} className="border border-[rgba(0,0,0,0.1)] rounded-[12px] p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-[18px] font-semibold text-[#323B42]">{po.orderNumber}</h4>
                        <p className="text-[14px] text-[#6b7280]">Supplier: {po.supplier}</p>
                        <p className="text-[14px] text-[#6b7280]">Date: {po.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[20px] font-bold text-[#007A5E]">â‚±{po.totalAmount.toLocaleString()}</p>
                        <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-[#fef3c6] text-[#92400e]">
                          Pending Approval
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-[14px] font-medium text-[#323B42] mb-2">Items:</p>
                      <div className="space-y-1">
                        {po.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[13px] bg-[#F8FAFB] px-3 py-2 rounded-[6px]">
                            <span className="text-[#323B42]">{item.name}</span>
                            <span className="text-[#323B42]">
                              {item.quantity} Ã— â‚±{item.price} = <span className="font-medium">â‚±{(item.quantity * item.price).toLocaleString()}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedPOForAction === po.id ? (
                      <div className="mt-4 border-t border-[rgba(0,0,0,0.1)] pt-4">
                        <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                          Rejection Remarks <span className="text-[#E7000B]">*</span>
                        </label>
                        <textarea
                          value={rejectionRemarks}
                          onChange={(e) => setRejectionRemarks(e.target.value)}
                          placeholder="Provide reason for rejection..."
                          className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E] mb-3 resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectPO(po.id)}
                            className="flex-1 bg-[#E7000B] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#D10000] transition-colors"
                          >
                            Confirm Rejection
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPOForAction(null);
                              setRejectionRemarks('');
                            }}
                            className="flex-1 bg-[#F8FAFB] text-[#323B42] px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#E5E7EB] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleApprovePO(po.id)}
                          className="flex-1 bg-[#00A63E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#008F35] transition-colors"
                        >
                          <CheckCircle className="size-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => setSelectedPOForAction(po.id)}
                          className="flex-1 bg-white border border-[#E7000B] text-[#E7000B] px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#ffe2e2] transition-colors"
                        >
                          <XCircle className="size-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Products Received View
