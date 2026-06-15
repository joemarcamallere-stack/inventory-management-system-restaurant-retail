import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, X, Search, Package, ArrowRightLeft, CheckCircle, RefreshCw, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import {
  getTransfers,
  createTransfer,
  dispatchTransfer,
  completeTransfer,
  cancelTransfer,
  getLocations,
  getInventory,
  createStockMovement,
} from '../../app/api/client';

const TRANSFER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In Transit',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const TRANSFER_STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-[#fff4e6] text-[#FFA500]',
  IN_TRANSIT: 'bg-[#E0F2F2] text-[#007A5E]',
  COMPLETED: 'bg-[#E0F5F1] text-[#008967]',
  CANCELLED: 'bg-[#ffe2e2] text-[#E7000B]',
};

export default function TransfersView({
  currentUser,
}: {
  currentUser: { email: string; role: string } | null;
}) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transfers' | 'adjustments'>('transfers');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [transferForm, setTransferForm] = useState({
    fromLocationId: '',
    toLocationId: '',
    notes: '',
    items: [] as { inventoryItemId: string; name: string; quantity: number; maxQuantity: number; locationId: string }[],
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'Add' as 'Add' | 'Remove' | 'Damage' | 'Lost' | 'Found' | 'Recount',
    reason: '',
    items: [] as { inventoryItemId: string; name: string; quantityChange: number; locationId: string; currentQuantity: number }[],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [transfersData, locationsData, inventoryData] = await Promise.all([
        getTransfers(),
        getLocations(),
        getInventory({ itemType: 'RETAIL_ITEM' }),
      ]);
      setTransfers(transfersData);
      setLocations(locationsData);
      setInventory(inventoryData);
    } catch (err) {
      console.error('Failed to load transfers data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const availableItemsForTransfer = inventory.filter(
    (item: any) => item.locationId === transferForm.fromLocationId && item.quantity > 0
  );

  const availableItemsForAdjustment = inventory.filter(
    (item: any) => item.quantity > 0 || adjustmentForm.type === 'Add' || adjustmentForm.type === 'Found'
  );

  const toggleCategory = (cat: string) => {
    const n = new Set(expandedCategories);
    n.has(cat) ? n.delete(cat) : n.add(cat);
    setExpandedCategories(n);
  };

  const toggleSubcategory = (key: string) => {
    const n = new Set(expandedSubcategories);
    n.has(key) ? n.delete(key) : n.add(key);
    setExpandedSubcategories(n);
  };

  const groupedAvailableItems = useMemo(() => {
    const items = activeTab === 'transfers' ? availableItemsForTransfer : availableItemsForAdjustment;
    const filtered = items.filter((item: any) =>
      item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(itemSearchTerm.toLowerCase())
    );
    const grouped: Record<string, Record<string, any[]>> = {};
    filtered.forEach((item: any) => {
      const cat = item.category || 'Uncategorized';
      const sub = item.subcategory || 'Other';
      if (!grouped[cat]) grouped[cat] = {};
      if (!grouped[cat][sub]) grouped[cat][sub] = [];
      grouped[cat][sub].push(item);
    });
    return grouped;
  }, [availableItemsForTransfer, availableItemsForAdjustment, activeTab, itemSearchTerm]);

  const handleAddItemToTransfer = (item: any) => {
    if (!transferForm.items.find(i => i.inventoryItemId === item.id)) {
      setTransferForm({ ...transferForm, items: [...transferForm.items, { inventoryItemId: item.id, name: item.name, quantity: 1, maxQuantity: item.quantity, locationId: item.locationId }] });
    }
    setShowItemSelector(false);
  };

  const handleAddItemToAdjustment = (item: any) => {
    if (!adjustmentForm.items.find(i => i.inventoryItemId === item.id)) {
      const qChange = (adjustmentForm.type === 'Add' || adjustmentForm.type === 'Found') ? 1 : -1;
      setAdjustmentForm({ ...adjustmentForm, items: [...adjustmentForm.items, { inventoryItemId: item.id, name: item.name, quantityChange: qChange, locationId: item.locationId, currentQuantity: item.quantity }] });
    }
    setShowItemSelector(false);
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.fromLocationId || !transferForm.toLocationId || transferForm.items.length === 0) {
      alert('Fill in all required fields and add at least one item');
      return;
    }
    setSaving(true);
    try {
      await createTransfer({
        fromLocationId: transferForm.fromLocationId,
        toLocationId: transferForm.toLocationId,
        notes: transferForm.notes || undefined,
        items: transferForm.items.map(i => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity })),
      });
      setTransferForm({ fromLocationId: '', toLocationId: '', notes: '', items: [] });
      setShowTransferModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message ?? 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await dispatchTransfer(id);
      await loadData();
    } catch (err: any) {
      alert(err.message ?? 'Failed to dispatch transfer');
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Complete this transfer? Stock will be moved.')) return;
    try {
      await completeTransfer(id);
      await loadData();
    } catch (err: any) {
      alert(err.message ?? 'Failed to complete transfer');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this transfer?')) return;
    try {
      await cancelTransfer(id);
      await loadData();
    } catch (err: any) {
      alert(err.message ?? 'Failed to cancel transfer');
    }
  };

  const handleCreateAdjustment = async () => {
    if (!adjustmentForm.reason || adjustmentForm.items.length === 0) {
      alert('Please provide a reason and add at least one item');
      return;
    }
    setSaving(true);
    try {
      for (const adjItem of adjustmentForm.items) {
        const invItem = inventory.find((i: any) => i.id === adjItem.inventoryItemId);
        if (!invItem) continue;
        const qty = Math.abs(adjItem.quantityChange);
        if (qty === 0) continue;
        const movType = adjItem.quantityChange >= 0 ? 'STOCK_IN' : 'STOCK_OUT';
        await createStockMovement({
          type: 'ADJUSTMENT',
          quantity: qty,
          previousQuantity: invItem.quantity,
          newQuantity: Math.max(0, invItem.quantity + adjItem.quantityChange),
          unit: invItem.unit,
          reason: adjustmentForm.reason,
          notes: `${adjustmentForm.type} adjustment`,
          itemId: invItem.id,
          locationId: invItem.locationId,
        });
      }
      setAdjustmentForm({ type: 'Add', reason: '', items: [] });
      setShowAdjustmentModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message ?? 'Failed to create adjustment');
    } finally {
      setSaving(false);
    }
  };

  const filteredTransfers = transfers.filter(t => filterStatus === 'all' || t.status === filterStatus);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#6b7280]">Loading transfers…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">Transfers & Adjustments</h2>
          <p className="text-[#323B42] text-[14px] mt-1">Manage inventory transfers and stock adjustments</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowTransferModal(true)} className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#008967]">
            <ArrowRightLeft className="size-4" />
            New Transfer
          </button>
          <button onClick={() => setShowAdjustmentModal(true)} className="bg-[#008967] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#007A5E]">
            <Plus className="size-4" />
            New Adjustment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] overflow-hidden mb-4">
        <div className="flex border-b border-[rgba(0,0,0,0.1)]">
          <button onClick={() => setActiveTab('transfers')} className={`flex-1 px-6 py-3 text-[16px] font-medium transition-colors relative ${activeTab === 'transfers' ? 'bg-[#E0F2F2] text-[#007A5E]' : 'text-[#323B42] hover:bg-[#F8FAFB]'}`}>
            {activeTab === 'transfers' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#007A5E]" />}
            <div className="flex items-center justify-center gap-2">
              <ArrowRightLeft className="size-5" />
              Transfers
              <span className={`px-2 py-0.5 rounded text-[12px] font-semibold ${activeTab === 'transfers' ? 'bg-[#007A5E] text-white' : 'bg-[#F8FAFB] text-[#323B42]'}`}>{transfers.length}</span>
            </div>
          </button>
          <button onClick={() => setActiveTab('adjustments')} className={`flex-1 px-6 py-3 text-[16px] font-medium transition-colors relative ${activeTab === 'adjustments' ? 'bg-[#E0F5F1] text-[#008967]' : 'text-[#323B42] hover:bg-[#F8FAFB]'}`}>
            {activeTab === 'adjustments' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#008967]" />}
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="size-5" />
              Adjustments
            </div>
          </button>
        </div>
      </div>

      {/* Filter — only for transfers tab */}
      {activeTab === 'transfers' && (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] mb-4 p-4">
          <div className="flex items-center gap-2">
            <label className="text-[14px] text-[#323B42] font-medium">Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[14px] bg-white focus:outline-none focus:border-[#007A5E]">
              <option value="all">All</option>
              <option value="PENDING">Pending</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      )}

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
            filteredTransfers.map((transfer: any) => (
              <div key={transfer.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[18px] font-semibold text-[#323B42]">{transfer.transferNumber}</h3>
                      <span className={`px-3 py-1 rounded text-[12px] font-semibold ${TRANSFER_STATUS_CLASS[transfer.status] ?? ''}`}>
                        {TRANSFER_STATUS_LABEL[transfer.status] ?? transfer.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[14px] text-[#323B42] mb-2">
                      <span className="font-medium">{transfer.fromLocation?.name}</span>
                      <ArrowRightLeft className="size-4 text-[#007A5E]" />
                      <span className="font-medium">{transfer.toLocation?.name}</span>
                    </div>
                    <p className="text-[13px] text-[#6b7280]">Date: {new Date(transfer.createdAt).toLocaleDateString()}</p>
                    {transfer.createdBy && <p className="text-[13px] text-[#6b7280]">Created by: {transfer.createdBy.name}</p>}
                    {transfer.notes && <p className="text-[13px] text-[#6b7280] mt-1">Notes: {transfer.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[20px] font-bold text-[#323B42]">{transfer.items?.length}</p>
                    <p className="text-[12px] text-[#6b7280]">items</p>
                  </div>
                </div>

                <div className="border-t border-[rgba(0,0,0,0.1)] pt-4 mb-4">
                  <p className="text-[14px] font-medium text-[#323B42] mb-2">Items:</p>
                  <div className="space-y-2">
                    {transfer.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-[13px] bg-[#F8FAFB] rounded px-3 py-2">
                        <span className="text-[#323B42] font-medium">{item.inventoryItem?.name ?? item.inventoryItemId}</span>
                        <span className="text-[#323B42]">Qty: <span className="font-semibold text-[#007A5E]">{item.quantity}</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                {transfer.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleDispatch(transfer.id)} className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967]">
                      Start Transit
                    </button>
                    <button onClick={() => handleCancel(transfer.id)} className="flex-1 px-4 py-2 border border-[#E7000B] text-[#E7000B] rounded-[8px] text-[14px] font-medium hover:bg-[#ffe2e2]">
                      Cancel
                    </button>
                  </div>
                )}

                {transfer.status === 'IN_TRANSIT' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleComplete(transfer.id)} className="flex-1 px-4 py-2 bg-[#008967] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#007A5E]">
                      Complete Transfer
                    </button>
                    <button onClick={() => handleCancel(transfer.id)} className="flex-1 px-4 py-2 border border-[#E7000B] text-[#E7000B] rounded-[8px] text-[14px] font-medium hover:bg-[#ffe2e2]">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
          <RefreshCw className="size-12 text-[#d1d5dc] mx-auto mb-3" />
          <p className="text-[16px] text-[#323B42] font-medium">Stock Adjustments</p>
          <p className="text-[14px] text-[#6b7280] mt-1">Use "New Adjustment" to record stock changes. Each adjustment is immediately saved as a stock movement.</p>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[24px] font-bold text-[#323B42]">Create Transfer</h3>
              <button onClick={() => { setShowTransferModal(false); setTransferForm({ fromLocationId: '', toLocationId: '', notes: '', items: [] }); }} className="p-2 hover:bg-[#F8FAFB] rounded">
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">From Location *</label>
                  <select value={transferForm.fromLocationId} onChange={(e) => setTransferForm({ ...transferForm, fromLocationId: e.target.value, items: [] })} className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]">
                    <option value="">Select location</option>
                    {locations.map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">To Location *</label>
                  <select value={transferForm.toLocationId} onChange={(e) => setTransferForm({ ...transferForm, toLocationId: e.target.value })} className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]">
                    <option value="">Select location</option>
                    {locations.filter((loc: any) => loc.id !== transferForm.fromLocationId).map((loc: any) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Notes</label>
                <textarea value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]" rows={2} placeholder="Optional notes" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[16px] font-semibold text-[#323B42]">Items ({transferForm.items.length})</h4>
                  <button onClick={() => setShowItemSelector(true)} disabled={!transferForm.fromLocationId} className="px-3 py-1.5 bg-[#007A5E] text-white rounded-[6px] text-[13px] font-medium flex items-center gap-2 hover:bg-[#008967] disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="size-3" /> Add Item
                  </button>
                </div>
                {transferForm.items.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] text-center py-8">{!transferForm.fromLocationId ? 'Select a source location first' : 'No items added yet'}</p>
                ) : (
                  <div className="space-y-2">
                    {transferForm.items.map((item) => (
                      <div key={item.inventoryItemId} className="flex items-center justify-between bg-[#F8FAFB] rounded-[8px] px-4 py-3">
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                          <p className="text-[12px] text-[#6b7280]">Available: {item.maxQuantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setTransferForm({ ...transferForm, items: transferForm.items.map(i => i.inventoryItemId === item.inventoryItemId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i) })} className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB]">-</button>
                            <span className="text-[14px] font-medium text-[#323B42] w-8 text-center">{item.quantity}</span>
                            <button onClick={() => setTransferForm({ ...transferForm, items: transferForm.items.map(i => i.inventoryItemId === item.inventoryItemId ? { ...i, quantity: Math.min(i.maxQuantity, i.quantity + 1) } : i) })} disabled={item.quantity >= item.maxQuantity} className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB]">+</button>
                          </div>
                          <button onClick={() => setTransferForm({ ...transferForm, items: transferForm.items.filter(i => i.inventoryItemId !== item.inventoryItemId) })} className="text-[#E7000B] hover:bg-[#ffe2e2] p-1 rounded"><Trash2 className="size-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowTransferModal(false); setTransferForm({ fromLocationId: '', toLocationId: '', notes: '', items: [] }); }} className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB]">Cancel</button>
              <button onClick={handleCreateTransfer} disabled={saving} className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] disabled:opacity-60">{saving ? 'Creating…' : 'Create Transfer'}</button>
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
              <button onClick={() => { setShowAdjustmentModal(false); setAdjustmentForm({ type: 'Add', reason: '', items: [] }); }} className="p-2 hover:bg-[#F8FAFB] rounded"><X className="size-5 text-[#323B42]" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">Adjustment Type *</label>
                  <select value={adjustmentForm.type} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value as any, items: [] })} className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]">
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
                  <input type="text" value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })} className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]" placeholder="e.g., Damaged during display" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[16px] font-semibold text-[#323B42]">Items ({adjustmentForm.items.length})</h4>
                  <button onClick={() => setShowItemSelector(true)} className="px-3 py-1.5 bg-[#008967] text-white rounded-[6px] text-[13px] font-medium flex items-center gap-2 hover:bg-[#007A5E]"><Plus className="size-3" /> Add Item</button>
                </div>
                {adjustmentForm.items.length === 0 ? (
                  <p className="text-[14px] text-[#6b7280] text-center py-8">No items added yet</p>
                ) : (
                  <div className="space-y-2">
                    {adjustmentForm.items.map((item) => (
                      <div key={item.inventoryItemId} className="flex items-center justify-between bg-[#F8FAFB] rounded-[8px] px-4 py-3">
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                          <p className="text-[12px] text-[#6b7280]">Current qty: {item.currentQuantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setAdjustmentForm({ ...adjustmentForm, items: adjustmentForm.items.map(i => i.inventoryItemId === item.inventoryItemId ? { ...i, quantityChange: i.quantityChange - 1 } : i) })} className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB]">-</button>
                            <span className={`text-[14px] font-medium w-12 text-center ${item.quantityChange >= 0 ? 'text-[#008967]' : 'text-[#E7000B]'}`}>{item.quantityChange >= 0 ? '+' : ''}{item.quantityChange}</span>
                            <button onClick={() => setAdjustmentForm({ ...adjustmentForm, items: adjustmentForm.items.map(i => i.inventoryItemId === item.inventoryItemId ? { ...i, quantityChange: i.quantityChange + 1 } : i) })} className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB]">+</button>
                          </div>
                          <button onClick={() => setAdjustmentForm({ ...adjustmentForm, items: adjustmentForm.items.filter(i => i.inventoryItemId !== item.inventoryItemId) })} className="text-[#E7000B] hover:bg-[#ffe2e2] p-1 rounded"><Trash2 className="size-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdjustmentModal(false); setAdjustmentForm({ type: 'Add', reason: '', items: [] }); }} className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB]">Cancel</button>
              <button onClick={handleCreateAdjustment} disabled={saving} className="flex-1 px-4 py-2 bg-[#008967] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#007A5E] disabled:opacity-60">{saving ? 'Saving…' : 'Create Adjustment'}</button>
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
                <p className="text-[14px] text-[#6b7280] mt-1">{activeTab === 'transfers' ? `Items from ${locations.find((l: any) => l.id === transferForm.fromLocationId)?.name ?? 'selected location'}` : 'All inventory items'}</p>
              </div>
              <button onClick={() => { setShowItemSelector(false); setItemSearchTerm(''); setExpandedCategories(new Set()); setExpandedSubcategories(new Set()); }} className="p-2 hover:bg-[#F8FAFB] rounded"><X className="size-5 text-[#323B42]" /></button>
            </div>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#6b7280]" />
                <input type="text" value={itemSearchTerm} onChange={(e) => setItemSearchTerm(e.target.value)} placeholder="Search items…" className="w-full pl-10 pr-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]" />
              </div>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {Object.keys(groupedAvailableItems).length === 0 ? (
                <div className="text-center py-12">
                  <Package className="size-16 text-[#d1d5dc] mx-auto mb-3" />
                  <p className="text-[16px] text-[#323B42] font-medium">No items found</p>
                  <p className="text-[14px] text-[#6b7280] mt-1">{itemSearchTerm ? 'Try adjusting your search' : activeTab === 'transfers' ? 'No items in the selected location' : 'No items available'}</p>
                </div>
              ) : (
                Object.entries(groupedAvailableItems).map(([category, subcategories]) => {
                  const isExpanded = expandedCategories.has(category);
                  const count = Object.values(subcategories).flat().length;
                  return (
                    <div key={category} className="border border-[rgba(0,0,0,0.1)] rounded-[10px] overflow-hidden">
                      <button onClick={() => toggleCategory(category)} className="w-full flex items-center gap-3 px-4 py-3 bg-[#F8FAFB] hover:bg-[#e9ecef]">
                        {isExpanded ? <ChevronDown className="size-5 text-[#323B42]" /> : <ChevronRight className="size-5 text-[#323B42]" />}
                        <Package className="size-5 text-[#007A5E]" />
                        <span className="text-[16px] font-semibold text-[#323B42]">{category}</span>
                        <span className="ml-auto text-[13px] text-[#323B42] bg-white px-3 py-1 rounded-full font-medium">{count} items</span>
                      </button>
                      {isExpanded && (
                        <div className="bg-white">
                          {Object.entries(subcategories).map(([sub, items]) => {
                            const key = `${category}-${sub}`;
                            const isSubExpanded = expandedSubcategories.has(key);
                            return (
                              <div key={key} className="border-t border-[rgba(0,0,0,0.1)]">
                                <button onClick={() => toggleSubcategory(key)} className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-[#F8FAFB]">
                                  {isSubExpanded ? <ChevronDown className="size-4 text-[#323B42]" /> : <ChevronRight className="size-4 text-[#323B42]" />}
                                  <span className="text-[14px] font-medium text-[#323B42]">{sub}</span>
                                  <span className="ml-auto text-[12px] text-[#6b7280] bg-[#F8FAFB] px-2 py-0.5 rounded-full">{items.length}</span>
                                </button>
                                {isSubExpanded && (
                                  <div className="bg-[#F8FAFB] px-6 py-2 space-y-2">
                                    {items.map((item: any) => {
                                      const isAdded = activeTab === 'transfers'
                                        ? transferForm.items.some(i => i.inventoryItemId === item.id)
                                        : adjustmentForm.items.some(i => i.inventoryItemId === item.id);
                                      return (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] hover:border-[#007A5E]">
                                          <div className="flex-1">
                                            <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                              <span className="text-[12px] text-[#6b7280]"><span className="font-medium">Location:</span> {item.location?.name}</span>
                                              <span className="text-[12px] text-[#6b7280]">•</span>
                                              <span className="text-[12px] text-[#6b7280]"><span className="font-medium">Qty:</span> {item.quantity}</span>
                                            </div>
                                          </div>
                                          <button onClick={() => activeTab === 'transfers' ? handleAddItemToTransfer(item) : handleAddItemToAdjustment(item)} disabled={isAdded} className={`px-4 py-2 rounded-[6px] text-[13px] font-medium ml-4 ${isAdded ? 'bg-[#e9ecef] text-[#6b7280] cursor-not-allowed' : 'bg-[#007A5E] text-white hover:bg-[#008967]'}`}>
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
            <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.1)] flex items-center justify-between">
              <p className="text-[14px] text-[#6b7280]">{activeTab === 'transfers' ? transferForm.items.length : adjustmentForm.items.length} item(s) selected</p>
              <button onClick={() => { setShowItemSelector(false); setItemSearchTerm(''); setExpandedCategories(new Set()); setExpandedSubcategories(new Set()); }} className="px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967]">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
