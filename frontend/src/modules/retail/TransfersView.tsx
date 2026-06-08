import { useState, useMemo } from 'react';
import { Plus, X, Search, Package, ArrowRightLeft, CheckCircle, XCircle, Clock, RefreshCw, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import type { Transfer, Adjustment, InventoryItem, Location } from '../../app/utils/generateSampleData';

export default function TransfersView({
  transfers,
  setTransfers,
  adjustments,
  setAdjustments,
  inventory,
  setInventory,
  locations,
  currentUser
}: {
  transfers: Transfer[];
  setTransfers: React.Dispatch<React.SetStateAction<Transfer[]>>;
  adjustments: Adjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<Adjustment[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  locations: Location[];
  currentUser: { email: string; role: string } | null;
}) {
  const [activeTab, setActiveTab] = useState<'transfers' | 'adjustments'>('transfers');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  const [transferForm, setTransferForm] = useState({
    fromLocation: '',
    toLocation: '',
    items: [] as { itemId: string; name: string; quantity: number; maxQuantity: number }[],
    notes: ''
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'Add' as 'Add' | 'Remove' | 'Damage' | 'Lost' | 'Found' | 'Recount',
    reason: '',
    items: [] as { itemId: string; name: string; quantityChange: number; location: string; currentQuantity: number }[]
  });

  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  const filteredTransfers = transfers.filter(transfer =>
    filterStatus === 'all' || transfer.status === filterStatus
  );

  const filteredAdjustments = adjustments.filter(adj =>
    filterStatus === 'all' || adj.status === filterStatus
  );

  // Get available items for transfer from source location
  const availableItemsForTransfer = inventory.filter(
    item => item.location === transferForm.fromLocation && item.quantity > 0 && item.condition !== 'Damaged'
  );

  // Get all inventory items for adjustments
  const availableItemsForAdjustment = inventory.filter(item => item.quantity > 0 || adjustmentForm.type === 'Add' || adjustmentForm.type === 'Found');

  // Toggle functions for item selector
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSubcategory = (key: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubcategories(newExpanded);
  };

  // Group available items by category and subcategory
  const groupedAvailableItems = useMemo(() => {
    const items = activeTab === 'transfers' ? availableItemsForTransfer : availableItemsForAdjustment;

    // Filter by search term
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      item.subcategory.toLowerCase().includes(itemSearchTerm.toLowerCase())
    );

    const grouped: {
      [category: string]: {
        [subcategory: string]: InventoryItem[]
      }
    } = {};

    filtered.forEach((item: InventoryItem) => {
      if (!grouped[item.category]) {
        grouped[item.category] = {};
      }
      if (!grouped[item.category][item.subcategory]) {
        grouped[item.category][item.subcategory] = [];
      }
      grouped[item.category][item.subcategory].push(item);
    });

    return grouped;
  }, [availableItemsForTransfer, availableItemsForAdjustment, activeTab, itemSearchTerm]);

  const handleAddItemToTransfer = (item: InventoryItem) => {
    const existing = transferForm.items.find(i => i.itemId === item.id);
    if (!existing) {
      setTransferForm({
        ...transferForm,
        items: [...transferForm.items, {
          itemId: item.id,
          name: item.name,
          quantity: 1,
          maxQuantity: item.quantity
        }]
      });
    }
    setShowItemSelector(false);
  };

  const handleRemoveItemFromTransfer = (itemId: string) => {
    setTransferForm({
      ...transferForm,
      items: transferForm.items.filter(i => i.itemId !== itemId)
    });
  };

  const handleUpdateTransferItemQuantity = (itemId: string, quantity: number) => {
    setTransferForm({
      ...transferForm,
      items: transferForm.items.map(i =>
        i.itemId === itemId ? { ...i, quantity: Math.min(Math.max(1, quantity), i.maxQuantity) } : i
      )
    });
  };

  const handleCreateTransfer = () => {
    if (!transferForm.fromLocation || !transferForm.toLocation || transferForm.items.length === 0) {
      alert('Please fill in all required fields and add at least one item');
      return;
    }

    if (transferForm.fromLocation === transferForm.toLocation) {
      alert('Source and destination locations must be different');
      return;
    }

    const newTransfer: Transfer = {
      id: Date.now().toString(),
      transferNumber: `TR-2026-${String(transfers.length + 1).padStart(3, '0')}`,
      fromLocation: transferForm.fromLocation,
      toLocation: transferForm.toLocation,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      items: transferForm.items.map(i => ({ itemId: i.itemId, name: i.name, quantity: i.quantity })),
      createdBy: currentUser?.email.split('@')[0] || 'User',
      notes: transferForm.notes
    };

    setTransfers([newTransfer, ...transfers]);
    setTransferForm({ fromLocation: '', toLocation: '', items: [], notes: '' });
    setShowTransferModal(false);
  };

  const handleCompleteTransfer = (transfer: Transfer) => {
    if (!confirm('Complete this transfer? Items will be moved to the destination location.')) return;

    // Update inventory
    const updatedInventory = [...inventory];

    transfer.items.forEach(transferItem => {
      // Remove from source location
      const sourceItemIndex = updatedInventory.findIndex(
        inv => inv.id === transferItem.itemId && inv.location === transfer.fromLocation
      );
      if (sourceItemIndex !== -1) {
        updatedInventory[sourceItemIndex] = {
          ...updatedInventory[sourceItemIndex],
          quantity: updatedInventory[sourceItemIndex].quantity - transferItem.quantity
        };
      }

      // Add to destination location (check if item already exists there)
      const destItemIndex = updatedInventory.findIndex(
        inv => inv.name === transferItem.name && inv.location === transfer.toLocation
      );

      if (destItemIndex !== -1) {
        updatedInventory[destItemIndex] = {
          ...updatedInventory[destItemIndex],
          quantity: updatedInventory[destItemIndex].quantity + transferItem.quantity
        };
      } else {
        const sourceItem = inventory.find(inv => inv.id === transferItem.itemId);
        if (sourceItem) {
          updatedInventory.push({
            ...sourceItem,
            id: `${sourceItem.id}-${transfer.toLocation}-${Date.now()}`,
            location: transfer.toLocation,
            quantity: transferItem.quantity,
            dateAdded: new Date().toISOString().split('T')[0]
          });
        }
      }
    });

    setInventory(updatedInventory.filter(item => item.quantity > 0));
    setTransfers(transfers.map(t =>
      t.id === transfer.id ? { ...t, status: 'Completed' } : t
    ));
  };

  const handleCancelTransfer = (transferId: string) => {
    if (!confirm('Cancel this transfer?')) return;
    setTransfers(transfers.map(t =>
      t.id === transferId ? { ...t, status: 'Cancelled' } : t
    ));
  };

  const handleStartTransit = (transferId: string) => {
    setTransfers(transfers.map(t =>
      t.id === transferId ? { ...t, status: 'In Transit' } : t
    ));
  };

  // Adjustment handlers
  const handleAddItemToAdjustment = (item: InventoryItem) => {
    const existing = adjustmentForm.items.find(i => i.itemId === item.id);
    if (!existing) {
      setAdjustmentForm({
        ...adjustmentForm,
        items: [...adjustmentForm.items, {
          itemId: item.id,
          name: item.name,
          quantityChange: adjustmentForm.type === 'Add' || adjustmentForm.type === 'Found' ? 1 : -1,
          location: item.location,
          currentQuantity: item.quantity
        }]
      });
    }
    setShowItemSelector(false);
  };

  const handleRemoveItemFromAdjustment = (itemId: string) => {
    setAdjustmentForm({
      ...adjustmentForm,
      items: adjustmentForm.items.filter(i => i.itemId !== itemId)
    });
  };

  const handleUpdateAdjustmentQuantity = (itemId: string, quantityChange: number) => {
    setAdjustmentForm({
      ...adjustmentForm,
      items: adjustmentForm.items.map(i =>
        i.itemId === itemId ? { ...i, quantityChange } : i
      )
    });
  };

  const handleCreateAdjustment = () => {
    if (!adjustmentForm.reason || adjustmentForm.items.length === 0) {
      alert('Please provide a reason and add at least one item');
      return;
    }

    const newAdjustment: Adjustment = {
      id: Date.now().toString(),
      adjustmentNumber: `ADJ-2026-${String(adjustments.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      type: adjustmentForm.type,
      reason: adjustmentForm.reason,
      items: adjustmentForm.items,
      createdBy: currentUser?.email.split('@')[0] || 'User',
      status: 'Pending'
    };

    setAdjustments([newAdjustment, ...adjustments]);
    setAdjustmentForm({ type: 'Add', reason: '', items: [] });
    setShowAdjustmentModal(false);
  };

  const handleApproveAdjustment = (adjustment: Adjustment) => {
    if (!confirm('Approve this adjustment? Inventory will be updated.')) return;

    // Update inventory
    const updatedInventory = inventory.map(item => {
      const adjItem = adjustment.items.find(ai => ai.itemId === item.id);
      if (adjItem) {
        return {
          ...item,
          quantity: Math.max(0, item.quantity + adjItem.quantityChange)
        };
      }
      return item;
    });

    setInventory(updatedInventory.filter(item => item.quantity > 0));
    setAdjustments(adjustments.map(adj =>
      adj.id === adjustment.id ? { ...adj, status: 'Approved' } : adj
    ));
  };

  const handleRejectAdjustment = (adjustmentId: string) => {
    if (!confirm('Reject this adjustment?')) return;
    setAdjustments(adjustments.map(adj =>
      adj.id === adjustmentId ? { ...adj, status: 'Rejected' } : adj
    ));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">Transfers & Adjustments</h2>
          <p className="text-[#323B42] text-[14px] mt-1">Manage inventory transfers and stock adjustments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTransferModal(true)}
            className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#008967] transition-colors"
          >
            <ArrowRightLeft className="size-4" />
            New Transfer
          </button>
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="bg-[#008967] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#007A5E] transition-colors"
          >
            <Plus className="size-4" />
            New Adjustment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] overflow-hidden mb-4">
        <div className="flex border-b border-[rgba(0,0,0,0.1)]">
          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex-1 px-6 py-3 text-[16px] font-medium transition-colors relative ${
              activeTab === 'transfers'
                ? 'bg-[#E0F2F2] text-[#007A5E]'
                : 'text-[#323B42] hover:bg-[#F8FAFB]'
            }`}
          >
            {activeTab === 'transfers' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#007A5E]" />
            )}
            <div className="flex items-center justify-center gap-2">
              <ArrowRightLeft className="size-5" />
              Transfers
              <span className={`px-2 py-0.5 rounded text-[12px] font-semibold ${
                activeTab === 'transfers'
                  ? 'bg-[#007A5E] text-white'
                  : 'bg-[#F8FAFB] text-[#323B42]'
              }`}>
                {transfers.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`flex-1 px-6 py-3 text-[16px] font-medium transition-colors relative ${
              activeTab === 'adjustments'
                ? 'bg-[#E0F5F1] text-[#008967]'
                : 'text-[#323B42] hover:bg-[#F8FAFB]'
            }`}
          >
            {activeTab === 'adjustments' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#008967]" />
            )}
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="size-5" />
              Adjustments
              <span className={`px-2 py-0.5 rounded text-[12px] font-semibold ${
                activeTab === 'adjustments'
                  ? 'bg-[#008967] text-white'
                  : 'bg-[#F8FAFB] text-[#323B42]'
              }`}>
                {adjustments.length}
              </span>
            </div>
          </button>
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
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            {activeTab === 'transfers' ? (
              <>
                <option value="In Transit">In Transit</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </>
            ) : (
              <>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'transfers' ? (
        <div className="space-y-4">
          {filteredTransfers.length === 0 ? (
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
              <ArrowRightLeft className="size-16 text-[#d1d5dc] mx-auto mb-4" />
              <p className="text-[16px] text-[#323B42] font-medium">No transfers found</p>
              <p className="text-[14px] text-[#6b7280] mt-1">Create a transfer to move items between locations</p>
            </div>
          ) : (
            filteredTransfers.map(transfer => (
              <div key={transfer.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[18px] font-semibold text-[#323B42]">{transfer.transferNumber}</h3>
                      <span className={`px-3 py-1 rounded text-[12px] font-semibold ${
                        transfer.status === 'Pending' ? 'bg-[#fff4e6] text-[#FFA500]' :
                        transfer.status === 'In Transit' ? 'bg-[#E0F2F2] text-[#007A5E]' :
                        transfer.status === 'Completed' ? 'bg-[#E0F5F1] text-[#008967]' :
                        'bg-[#ffe2e2] text-[#E7000B]'
                      }`}>
                        {transfer.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[14px] text-[#323B42] mb-2">
                      <span className="font-medium text-[#323B42]">{transfer.fromLocation}</span>
                      <ArrowRightLeft className="size-4 text-[#007A5E]" />
                      <span className="font-medium text-[#323B42]">{transfer.toLocation}</span>
                    </div>
                    <p className="text-[13px] text-[#6b7280]">Date: {transfer.date}</p>
                    <p className="text-[13px] text-[#6b7280]">Created by: {transfer.createdBy}</p>
                    {transfer.notes && (
                      <p className="text-[13px] text-[#6b7280] mt-1">Notes: {transfer.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[20px] font-bold text-[#323B42]">{transfer.items.length}</p>
                    <p className="text-[12px] text-[#6b7280]">items</p>
                  </div>
                </div>

                <div className="border-t border-[rgba(0,0,0,0.1)] pt-4 mb-4">
                  <p className="text-[14px] font-medium text-[#323B42] mb-2">Items:</p>
                  <div className="space-y-2">
                    {transfer.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[13px] bg-[#F8FAFB] rounded px-3 py-2">
                        <span className="text-[#323B42] font-medium">{item.name}</span>
                        <span className="text-[#323B42]">Qty: <span className="font-semibold text-[#007A5E]">{item.quantity}</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                {transfer.status === 'Pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartTransit(transfer.id)}
                      className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
                    >
                      Start Transit
                    </button>
                    <button
                      onClick={() => handleCancelTransfer(transfer.id)}
                      className="flex-1 px-4 py-2 border border-[#E7000B] text-[#E7000B] rounded-[8px] text-[14px] font-medium hover:bg-[#ffe2e2] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {transfer.status === 'In Transit' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCompleteTransfer(transfer)}
                      className="flex-1 px-4 py-2 bg-[#008967] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#007A5E] transition-colors"
                    >
                      Complete Transfer
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAdjustments.length === 0 ? (
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
              <RefreshCw className="size-16 text-[#d1d5dc] mx-auto mb-4" />
              <p className="text-[16px] text-[#323B42] font-medium">No adjustments found</p>
              <p className="text-[14px] text-[#6b7280] mt-1">Create an adjustment to modify inventory levels</p>
            </div>
          ) : (
            filteredAdjustments.map(adjustment => (
              <div key={adjustment.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[18px] font-semibold text-[#323B42]">{adjustment.adjustmentNumber}</h3>
                      <span className={`px-3 py-1 rounded text-[12px] font-semibold ${
                        adjustment.type === 'Add' || adjustment.type === 'Found' ? 'bg-[#E0F5F1] text-[#008967]' :
                        adjustment.type === 'Damage' || adjustment.type === 'Lost' ? 'bg-[#ffe2e2] text-[#E7000B]' :
                        'bg-[#fff4e6] text-[#FFA500]'
                      }`}>
                        {adjustment.type}
                      </span>
                      <span className={`px-3 py-1 rounded text-[12px] font-semibold ${
                        adjustment.status === 'Pending' ? 'bg-[#fff4e6] text-[#FFA500]' :
                        adjustment.status === 'Approved' ? 'bg-[#E0F5F1] text-[#008967]' :
                        'bg-[#ffe2e2] text-[#E7000B]'
                      }`}>
                        {adjustment.status}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#6b7280]">Date: {adjustment.date}</p>
                    <p className="text-[13px] text-[#6b7280]">Created by: {adjustment.createdBy}</p>
                    <p className="text-[13px] text-[#323B42] mt-1 font-medium">Reason: {adjustment.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[20px] font-bold text-[#323B42]">{adjustment.items.length}</p>
                    <p className="text-[12px] text-[#6b7280]">items</p>
                  </div>
                </div>

                <div className="border-t border-[rgba(0,0,0,0.1)] pt-4 mb-4">
                  <p className="text-[14px] font-medium text-[#323B42] mb-2">Items:</p>
                  <div className="space-y-2">
                    {adjustment.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[13px] bg-[#F8FAFB] rounded px-3 py-2">
                        <div className="flex-1">
                          <p className="text-[#323B42] font-medium">{item.name}</p>
                          <p className="text-[#6b7280] text-[12px]">{item.location}</p>
                        </div>
                        <span className={`font-semibold ${item.quantityChange >= 0 ? 'text-[#008967]' : 'text-[#E7000B]'}`}>
                          {item.quantityChange >= 0 ? '+' : ''}{item.quantityChange}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {adjustment.status === 'Pending' && currentUser?.role === 'Admin' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveAdjustment(adjustment)}
                      className="flex-1 px-4 py-2 bg-[#008967] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#007A5E] transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectAdjustment(adjustment.id)}
                      className="flex-1 px-4 py-2 border border-[#E7000B] text-[#E7000B] rounded-[8px] text-[14px] font-medium hover:bg-[#ffe2e2] transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[24px] font-bold text-[#323B42]">Create Transfer</h3>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferForm({ fromLocation: '', toLocation: '', items: [], notes: '' });
                }}
                className="p-2 hover:bg-[#F8FAFB] rounded"
              >
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">From Location *</label>
                  <select
                    value={transferForm.fromLocation}
                    onChange={(e) => setTransferForm({ ...transferForm, fromLocation: e.target.value, items: [] })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  >
                    <option value="">Select location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">To Location *</label>
                  <select
                    value={transferForm.toLocation}
                    onChange={(e) => setTransferForm({ ...transferForm, toLocation: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  >
                    <option value="">Select location</option>
                    {locations.filter(loc => loc.name !== transferForm.fromLocation).map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Notes</label>
                <textarea
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  rows={2}
                  placeholder="Optional notes about this transfer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[16px] font-semibold text-[#323B42]">Items ({transferForm.items.length})</h4>
                  <button
                    onClick={() => setShowItemSelector(true)}
                    disabled={!transferForm.fromLocation}
                    className="px-3 py-1.5 bg-[#007A5E] text-white rounded-[6px] text-[13px] font-medium flex items-center gap-2 hover:bg-[#008967] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="size-3" />
                    Add Item
                  </button>
                </div>

                {transferForm.items.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] text-center py-8">
                    {!transferForm.fromLocation ? 'Select a source location first' : 'No items added yet'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {transferForm.items.map((item) => (
                      <div key={item.itemId} className="flex items-center justify-between bg-[#F8FAFB] rounded-[8px] px-4 py-3">
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                          <p className="text-[12px] text-[#6b7280]">Available: {item.maxQuantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateTransferItemQuantity(item.itemId, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB]"
                            >
                              -
                            </button>
                            <span className="text-[14px] font-medium text-[#323B42] w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateTransferItemQuantity(item.itemId, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB]"
                              disabled={item.quantity >= item.maxQuantity}
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItemFromTransfer(item.itemId)}
                            className="text-[#E7000B] hover:bg-[#ffe2e2] p-1 rounded"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferForm({ fromLocation: '', toLocation: '', items: [], notes: '' });
                }}
                className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTransfer}
                className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
              >
                Create Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[24px] font-bold text-[#323B42]">Create Adjustment</h3>
              <button
                onClick={() => {
                  setShowAdjustmentModal(false);
                  setAdjustmentForm({ type: 'Add', reason: '', items: [] });
                }}
                className="p-2 hover:bg-[#F8FAFB] rounded"
              >
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Adjustment Type *</label>
                  <select
                    value={adjustmentForm.type}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value as any, items: [] })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  >
                    <option value="Add">Add Stock</option>
                    <option value="Remove">Remove Stock</option>
                    <option value="Damage">Damage</option>
                    <option value="Lost">Lost/Theft</option>
                    <option value="Found">Found</option>
                    <option value="Recount">Recount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Reason *</label>
                  <input
                    type="text"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="e.g., Damaged during display"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[16px] font-semibold text-[#323B42]">Items ({adjustmentForm.items.length})</h4>
                  <button
                    onClick={() => setShowItemSelector(true)}
                    className="px-3 py-1.5 bg-[#008967] text-white rounded-[6px] text-[13px] font-medium flex items-center gap-2 hover:bg-[#007A5E] transition-colors"
                  >
                    <Plus className="size-3" />
                    Add Item
                  </button>
                </div>

                {adjustmentForm.items.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] text-center py-8">No items added yet</p>
                ) : (
                  <div className="space-y-2">
                    {adjustmentForm.items.map((item) => (
                      <div key={item.itemId} className="flex items-center justify-between bg-[#F8FAFB] rounded-[8px] px-4 py-3">
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                          <p className="text-[12px] text-[#6b7280]">
                            {item.location} â€¢ Current: {item.currentQuantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateAdjustmentQuantity(item.itemId, item.quantityChange - 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB]"
                            >
                              -
                            </button>
                            <span className={`text-[14px] font-medium w-12 text-center ${
                              item.quantityChange >= 0 ? 'text-[#008967]' : 'text-[#E7000B]'
                            }`}>
                              {item.quantityChange >= 0 ? '+' : ''}{item.quantityChange}
                            </span>
                            <button
                              onClick={() => handleUpdateAdjustmentQuantity(item.itemId, item.quantityChange + 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB]"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItemFromAdjustment(item.itemId)}
                            className="text-[#E7000B] hover:bg-[#ffe2e2] p-1 rounded"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAdjustmentModal(false);
                  setAdjustmentForm({ type: 'Add', reason: '', items: [] });
                }}
                className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAdjustment}
                className="flex-1 px-4 py-2 bg-[#008967] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#007A5E] transition-colors"
              >
                Create Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Selector Modal */}
      {showItemSelector && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[20px] font-bold text-[#323B42]">Select Items</h3>
                <p className="text-[14px] text-[#6b7280] mt-1">
                  {activeTab === 'transfers'
                    ? `Browse items from ${transferForm.fromLocation}`
                    : 'Browse all inventory items'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowItemSelector(false);
                  setItemSearchTerm('');
                  setExpandedCategories(new Set());
                  setExpandedSubcategories(new Set());
                }}
                className="p-2 hover:bg-[#F8FAFB] rounded"
              >
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#6b7280]" />
                <input
                  type="text"
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  placeholder="Search items by name, category, or subcategory..."
                  className="w-full pl-10 pr-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                />
              </div>
            </div>

            {/* Grouped Items */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {Object.keys(groupedAvailableItems).length === 0 ? (
                <div className="text-center py-12">
                  <Package className="size-16 text-[#d1d5dc] mx-auto mb-3" />
                  <p className="text-[16px] text-[#323B42] font-medium">No items found</p>
                  <p className="text-[14px] text-[#6b7280] mt-1">
                    {itemSearchTerm
                      ? 'Try adjusting your search terms'
                      : activeTab === 'transfers'
                      ? 'No items available in the selected location'
                      : 'No items available for adjustment'}
                  </p>
                </div>
              ) : (
                Object.entries(groupedAvailableItems).map(([category, subcategories]) => {
                  const isCategoryExpanded = expandedCategories.has(category);
                  const categoryItemCount = Object.values(subcategories).flat().length;

                  return (
                    <div key={category} className="border border-[rgba(0,0,0,0.1)] rounded-[10px] overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-[#F8FAFB] hover:bg-[#e9ecef] transition-colors"
                      >
                        {isCategoryExpanded ? (
                          <ChevronDown className="size-5 text-[#323B42]" />
                        ) : (
                          <ChevronRight className="size-5 text-[#323B42]" />
                        )}
                        <Package className="size-5 text-[#007A5E]" />
                        <span className="text-[16px] font-semibold text-[#323B42]">{category}</span>
                        <span className="ml-auto text-[13px] text-[#323B42] bg-white px-3 py-1 rounded-full font-medium">
                          {categoryItemCount} items
                        </span>
                      </button>

                      {/* Subcategories */}
                      {isCategoryExpanded && (
                        <div className="bg-white">
                          {Object.entries(subcategories).map(([subcategory, items]) => {
                            const subcategoryKey = `${category}-${subcategory}`;
                            const isSubcategoryExpanded = expandedSubcategories.has(subcategoryKey);

                            return (
                              <div key={subcategoryKey} className="border-t border-[rgba(0,0,0,0.1)]">
                                {/* Subcategory Header */}
                                <button
                                  onClick={() => toggleSubcategory(subcategoryKey)}
                                  className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-[#F8FAFB] transition-colors"
                                >
                                  {isSubcategoryExpanded ? (
                                    <ChevronDown className="size-4 text-[#323B42]" />
                                  ) : (
                                    <ChevronRight className="size-4 text-[#323B42]" />
                                  )}
                                  <span className="text-[14px] font-medium text-[#323B42]">{subcategory}</span>
                                  <span className="ml-auto text-[12px] text-[#6b7280] bg-[#F8FAFB] px-2 py-0.5 rounded-full">
                                    {items.length}
                                  </span>
                                </button>

                                {/* Items */}
                                {isSubcategoryExpanded && (
                                  <div className="bg-[#F8FAFB] px-6 py-2 space-y-2">
                                    {items.map((item: InventoryItem) => {
                                      const isAdded = activeTab === 'transfers'
                                        ? transferForm.items.some(i => i.itemId === item.id)
                                        : adjustmentForm.items.some(i => i.itemId === item.id);

                                      return (
                                        <div
                                          key={item.id}
                                          className="flex items-center justify-between p-3 bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] hover:border-[#007A5E] transition-colors"
                                        >
                                          <div className="flex-1">
                                            <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                              <span className="text-[12px] text-[#6b7280]">
                                                <span className="font-medium">Size:</span> {item.size}
                                              </span>
                                              <span className="text-[12px] text-[#6b7280]">â€¢</span>
                                              <span className="text-[12px] text-[#6b7280]">
                                                <span className="font-medium">Location:</span> {item.location}
                                              </span>
                                              <span className="text-[12px] text-[#6b7280]">â€¢</span>
                                              <span className="text-[12px] text-[#6b7280]">
                                                <span className="font-medium">Qty:</span> {item.quantity}
                                              </span>
                                              <span className="text-[12px] text-[#6b7280]">â€¢</span>
                                              <span className={`text-[12px] font-medium ${
                                                item.condition === 'Excellent' ? 'text-[#00a63e]' :
                                                item.condition === 'Good' ? 'text-[#007A5E]' :
                                                item.condition === 'Fair' ? 'text-[#FFA500]' :
                                                'text-[#E7000B]'
                                              }`}>
                                                {item.condition}
                                              </span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              if (activeTab === 'transfers') {
                                                handleAddItemToTransfer(item);
                                              } else {
                                                handleAddItemToAdjustment(item);
                                              }
                                            }}
                                            disabled={isAdded}
                                            className={`px-4 py-2 rounded-[6px] text-[13px] font-medium transition-colors ml-4 ${
                                              isAdded
                                                ? 'bg-[#e9ecef] text-[#6b7280] cursor-not-allowed'
                                                : 'bg-[#007A5E] text-white hover:bg-[#008967]'
                                            }`}
                                          >
                                            {isAdded ? 'Added' : 'Add Item'}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between">
                <p className="text-[14px] text-[#6b7280]">
                  {activeTab === 'transfers'
                    ? `${transferForm.items.length} item(s) selected`
                    : `${adjustmentForm.items.length} item(s) selected`}
                </p>
                <button
                  onClick={() => {
                    setShowItemSelector(false);
                    setItemSearchTerm('');
                    setExpandedCategories(new Set());
                    setExpandedSubcategories(new Set());
                  }}
                  className="px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Multilocation View
