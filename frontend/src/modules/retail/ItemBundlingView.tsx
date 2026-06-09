import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronRight, ChevronDown, Folder, FolderOpen, AlertTriangle, Package, PackagePlus, ShoppingCart, PackageCheck, Layers, X, Eye, TrendingUp, TrendingDown, RefreshCw, CheckCircle, Users } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { createUser, deleteUser, updateUser, getPurchaseOrders, getPurchaseOrder, receivePurchaseOrder, getInventory, getBundles, createBundle, updateBundle, approveBundle, rejectBundle, activateBundle, deactivateBundle, deleteBundle } from '../../app/api/client';
import type {
  InventoryItem,
  PurchaseOrder,
  ProductReceived,
  Bundle,
  Transfer,
  Adjustment,
  Location,
  User,
} from '../../app/utils/generateSampleData';
import { categorySubcategories, CHART_COLORS } from '../../app/utils/constants';
import { autoSortItem } from '../../app/utils/autoSortingRules';

export function ItemBundlingView({
  currentUser
}: {
  currentUser: { email: string; role: string } | null;
}) {
  const [bundles, setBundles] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState(false);

  const [selectedBundle, setSelectedBundle] = useState<any | null>(null);
  const [bundleForm, setBundleForm] = useState({
    name: '',
    items: [] as { inventoryItemId: string; quantity: number }[],
    discount: 0
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [bundleData, inventoryData] = await Promise.all([
        getBundles(),
        getInventory({ itemType: 'UKAY_ITEM' }),
      ]);
      setBundles(bundleData);
      setInventory(inventoryData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Derived state ───────────────────────────────────────────────────────────

  const availableItems = inventory.filter((item: any) => item.quantity > 0 && item.condition !== 'Damaged');
  const availableCategories = Array.from(new Set(availableItems.map((item: any) => item.category as string))).sort();
  const filteredAvailableItems = availableItems.filter((item: any) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(itemSearchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredBundles = bundles.filter((bundle: any) => {
    const matchesSearch = bundle.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || bundle.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bundles.length,
    pending: bundles.filter((b: any) => b.status === 'PENDING').length,
    active: bundles.filter((b: any) => b.status === 'ACTIVE').length,
    totalValue: bundles.filter((b: any) => b.status === 'ACTIVE').reduce((sum: number, b: any) => sum + b.price, 0),
  };

  // ─── Bundle price calculation (uses local form state + fetched inventory) ────

  const calculateFormPrice = (items: { inventoryItemId: string; quantity: number }[], discount: number) => {
    const total = items.reduce((sum, fi) => {
      const inv = inventory.find((i: any) => i.id === fi.inventoryItemId);
      return sum + (inv ? inv.price * fi.quantity : 0);
    }, 0);
    return total * (1 - discount / 100);
  };

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setBundleForm({ name: '', items: [], discount: 0 });
    setSelectedBundle(null);
    setRejectionReason('');
  };

  const handleAddItemToBundle = (inventoryItemId: string) => {
    const existing = bundleForm.items.find(i => i.inventoryItemId === inventoryItemId);
    if (existing) {
      setBundleForm(prev => ({
        ...prev,
        items: prev.items.map(i => i.inventoryItemId === inventoryItemId ? { ...i, quantity: i.quantity + 1 } : i)
      }));
    } else {
      setBundleForm(prev => ({ ...prev, items: [...prev.items, { inventoryItemId, quantity: 1 }] }));
    }
  };

  const handleRemoveItemFromBundle = (inventoryItemId: string) => {
    setBundleForm(prev => ({ ...prev, items: prev.items.filter(i => i.inventoryItemId !== inventoryItemId) }));
  };

  const handleUpdateItemQuantity = (inventoryItemId: string, quantity: number) => {
    if (quantity <= 0) { handleRemoveItemFromBundle(inventoryItemId); return; }
    setBundleForm(prev => ({
      ...prev,
      items: prev.items.map(i => i.inventoryItemId === inventoryItemId ? { ...i, quantity } : i)
    }));
  };

  const handleCreateBundle = async () => {
    if (!bundleForm.name || bundleForm.items.length === 0) {
      setError('Please provide a bundle name and add at least one item');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await createBundle({ name: bundleForm.name, discount: bundleForm.discount, items: bundleForm.items });
      resetForm();
      setShowCreateModal(false);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditBundle = async () => {
    if (!selectedBundle || !bundleForm.name) return;
    try {
      setSaving(true);
      setError(null);
      await updateBundle(selectedBundle.id, { name: bundleForm.name, discount: bundleForm.discount });
      resetForm();
      setShowEditModal(false);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveBundle = async (id: string) => {
    try {
      setSaving(true);
      setError(null);
      await approveBundle(id);
      setShowApprovalModal(false);
      setSelectedBundle(null);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectBundle = async (id: string) => {
    if (!rejectionReason.trim()) { setError('Please provide a rejection reason'); return; }
    try {
      setSaving(true);
      setError(null);
      await rejectBundle(id, rejectionReason);
      setShowApprovalModal(false);
      setSelectedBundle(null);
      setRejectionReason('');
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivateBundle = async (id: string) => {
    try { setSaving(true); await activateBundle(id); await loadData(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDeactivateBundle = async (id: string) => {
    try { setSaving(true); await deactivateBundle(id); await loadData(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteBundle = async (id: string) => {
    if (!confirm('Delete this bundle? This cannot be undone.')) return;
    try { setSaving(true); await deleteBundle(id); await loadData(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const openEditModal = (bundle: any) => {
    setSelectedBundle(bundle);
    setBundleForm({
      name: bundle.name,
      discount: bundle.discount,
      items: (bundle.items ?? []).map((bi: any) => ({ inventoryItemId: bi.inventoryItemId, quantity: bi.quantity })),
    });
    setShowEditModal(true);
  };

  // ─── Status display helpers ───────────────────────────────────────────────────

  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
  };

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PENDING:  { bg: 'bg-[#fef3c6]', text: 'text-[#FFA500]' },
    APPROVED: { bg: 'bg-[#e0f2ff]', text: 'text-[#155DFC]' },
    REJECTED: { bg: 'bg-[#ffe2e2]', text: 'text-[#E7000B]' },
    ACTIVE:   { bg: 'bg-[#E0F5F1]', text: 'text-[#00a63e]' },
    INACTIVE: { bg: 'bg-[#e9ecef]', text: 'text-[#6b7280]' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">Item Bundling</h2>
          <p className="text-[#323B42] text-[14px] mt-1">Create combo deals and package offers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={loading}
          className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#008967] transition-colors disabled:opacity-50"
        >
          <Plus className="size-4" />
          Create Bundle
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[#ffe2e2] border border-[#E7000B] rounded-[8px] text-[14px] text-[#E7000B]">
          {error}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[24px] font-bold text-[#323B42]">
                {showCreateModal ? 'Create New Bundle' : 'Edit Bundle'}
              </h3>
              <button onClick={() => { resetForm(); setShowCreateModal(false); setShowEditModal(false); }} className="p-2 hover:bg-[#F8FAFB] rounded">
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Bundle Name *</label>
                <input
                  type="text"
                  value={bundleForm.name}
                  onChange={(e) => setBundleForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  placeholder="e.g., Summer Outfit Bundle"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Discount (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={bundleForm.discount}
                  onChange={(e) => setBundleForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                  onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  placeholder="e.g., 15"
                />
              </div>
            </div>

            <div className="border-t border-[rgba(0,0,0,0.1)] pt-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[16px] font-semibold text-[#323B42]">Bundle Items ({bundleForm.items.length})</h4>
                <button
                  onClick={() => setShowItemSelector(true)}
                  className="px-3 py-1.5 bg-[#007A5E] text-white rounded-[6px] text-[13px] font-medium flex items-center gap-2 hover:bg-[#008967] transition-colors"
                >
                  <Plus className="size-3" />
                  Add Item
                </button>
              </div>

              {bundleForm.items.length === 0 ? (
                <p className="text-[14px] text-[#323B42] text-center py-8">No items added yet</p>
              ) : (
                <div className="space-y-2">
                  {bundleForm.items.map((fi) => {
                    const inv = inventory.find((i: any) => i.id === fi.inventoryItemId);
                    return inv ? (
                      <div key={fi.inventoryItemId} className="flex items-center justify-between bg-[#F8FAFB] rounded-[8px] px-4 py-3">
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#323B42]">{inv.name}</p>
                          <p className="text-[12px] text-[#6b7280]">{inv.category} • ₱{inv.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleUpdateItemQuantity(fi.inventoryItemId, fi.quantity - 1)} className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB]">-</button>
                            <span className="text-[14px] font-medium text-[#323B42] w-8 text-center">{fi.quantity}</span>
                            <button onClick={() => handleUpdateItemQuantity(fi.inventoryItemId, fi.quantity + 1)} disabled={fi.quantity >= inv.quantity} className="w-6 h-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.1)] rounded text-[#323B42] hover:bg-[#F8FAFB] disabled:opacity-50">+</button>
                          </div>
                          <span className="text-[14px] font-semibold text-[#323B42] w-20 text-right">₱{(inv.price * fi.quantity).toLocaleString()}</span>
                          <button onClick={() => handleRemoveItemFromBundle(fi.inventoryItemId)} className="text-[#E7000B] hover:bg-[#ffe2e2] p-1 rounded">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {bundleForm.items.length > 0 && (
              <div className="bg-[#F3F4F6] rounded-[12px] p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[14px] text-[#323B42]">Original Total:</span>
                  <span className="text-[16px] font-medium text-[#323B42] line-through">₱{calculateFormPrice(bundleForm.items, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[14px] text-[#323B42]">Discount ({bundleForm.discount}%):</span>
                  <span className="text-[16px] font-medium text-[#E7000B]">-₱{(calculateFormPrice(bundleForm.items, 0) - calculateFormPrice(bundleForm.items, bundleForm.discount)).toLocaleString()}</span>
                </div>
                <div className="border-t border-[rgba(0,0,0,0.2)] pt-2 flex justify-between items-center">
                  <span className="text-[16px] font-semibold text-[#323B42]">Bundle Price:</span>
                  <span className="text-[24px] font-bold text-[#007A5E]">₱{calculateFormPrice(bundleForm.items, bundleForm.discount).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { resetForm(); setShowCreateModal(false); setShowEditModal(false); }} className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors">
                Cancel
              </button>
              <button
                onClick={showCreateModal ? handleCreateBundle : handleEditBundle}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : (showCreateModal ? 'Create Bundle' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedBundle && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-[#323B42]">Review Bundle</h3>
              <button onClick={() => { setShowApprovalModal(false); setSelectedBundle(null); setRejectionReason(''); }} className="p-2 hover:bg-[#F8FAFB] rounded">
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-[#F8FAFB] rounded-[8px]">
              <h4 className="text-[16px] font-semibold text-[#323B42] mb-2">{selectedBundle.name}</h4>
              <p className="text-[13px] text-[#6b7280]">Created by: {selectedBundle.createdBy?.name ?? 'N/A'}</p>
              <p className="text-[13px] text-[#6b7280]">Date: {new Date(selectedBundle.createdAt).toLocaleDateString()}</p>
              <p className="text-[13px] text-[#6b7280]">Items: {(selectedBundle.items ?? []).length}</p>
              <p className="text-[13px] text-[#6b7280]">Discount: {selectedBundle.discount}%</p>
              <p className="text-[16px] font-bold text-[#007A5E] mt-2">Price: ₱{selectedBundle.price.toLocaleString()}</p>
            </div>
            <div className="mb-4">
              <label className="block text-[14px] font-medium text-[#323B42] mb-2">Rejection Reason (required if rejecting)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E] resize-none"
                rows={3}
                placeholder="Provide a reason if rejecting this bundle..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleRejectBundle(selectedBundle.id)} disabled={saving} className="flex-1 px-4 py-2 bg-[#E7000B] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#c40009] transition-colors disabled:opacity-50">
                Reject
              </button>
              <button onClick={() => handleApproveBundle(selectedBundle.id)} disabled={saving} className="flex-1 px-4 py-2 bg-[#00a63e] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008a34] transition-colors disabled:opacity-50">
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Selector Modal */}
      {showItemSelector && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-[#323B42]">Select Items for Bundle</h3>
              <button onClick={() => { setShowItemSelector(false); setSelectedCategory('all'); setItemSearchTerm(''); }} className="p-2 hover:bg-[#F8FAFB] rounded">
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>
            <div className="mb-4 pb-4 border-b border-[rgba(0,0,0,0.1)]">
              <p className="text-[12px] font-medium text-[#323B42] mb-3">Filter by Category:</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${selectedCategory === 'all' ? 'bg-[#007A5E] text-white shadow-md' : 'bg-[#F8FAFB] text-[#323B42] hover:bg-[#e9ecef]'}`}>
                  All Items ({availableItems.length})
                </button>
                {availableCategories.map((category: any) => (
                  <button key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${selectedCategory === category ? 'bg-[#007A5E] text-white shadow-md' : 'bg-[#F8FAFB] text-[#323B42] hover:bg-[#e9ecef]'}`}>
                    {category} ({availableItems.filter((i: any) => i.category === category).length})
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[#6b7280]" />
                <input type="text" value={itemSearchTerm} onChange={(e) => setItemSearchTerm(e.target.value)} placeholder="Search items by name..." className="w-full pl-10 pr-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredAvailableItems.length === 0 ? (
                <p className="text-center py-8 text-[#6b7280]">No items found</p>
              ) : (
                filteredAvailableItems.map((item: any) => {
                  const isAdded = bundleForm.items.some(i => i.inventoryItemId === item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-[rgba(0,0,0,0.1)] rounded-[8px] hover:bg-[#F8FAFB] transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E0F2F2] text-[#007A5E]">{item.category}</span>
                        </div>
                        <p className="text-[12px] text-[#6b7280] mt-1">{item.subcategory} • {item.quantity} available • ₱{item.price}</p>
                      </div>
                      <button
                        onClick={() => { handleAddItemToBundle(item.id); setShowItemSelector(false); setSelectedCategory('all'); setItemSearchTerm(''); }}
                        disabled={isAdded}
                        className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors ${isAdded ? 'bg-[#e9ecef] text-[#6b7280] cursor-not-allowed' : 'bg-[#007A5E] text-white hover:bg-[#008967]'}`}
                      >
                        {isAdded ? 'Added' : 'Add'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">Total Bundles</p>
          <p className="text-[#323B42] text-[24px] font-bold">{loading ? '—' : stats.total}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#FFA500] text-[12px] mb-1">Pending Approval</p>
          <p className="text-[#FFA500] text-[24px] font-bold">{loading ? '—' : stats.pending}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#00a63e] text-[12px] mb-1">Active Bundles</p>
          <p className="text-[#00a63e] text-[24px] font-bold">{loading ? '—' : stats.active}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">Active Value</p>
          <p className="text-[#007A5E] text-[24px] font-bold">₱{loading ? '—' : stats.totalValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] mb-4 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            <Search className="size-5 text-[#6b7280]" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search bundles..." className="flex-1 text-[14px] focus:outline-none text-[#323B42]" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[14px] font-medium text-[#323B42]">Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[14px] bg-white focus:outline-none focus:border-[#007A5E]">
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bundles Grid */}
      {loading ? (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
          <p className="text-[14px] text-[#6b7280]">Loading...</p>
        </div>
      ) : filteredBundles.length === 0 ? (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
          <Layers className="size-16 text-[#d1d5dc] mx-auto mb-4" />
          <p className="text-[16px] text-[#323B42] font-medium">No bundles found</p>
          <p className="text-[14px] text-[#6b7280] mt-1">Create your first bundle to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredBundles.map((bundle: any) => {
            const originalPrice = (bundle.items ?? []).reduce((sum: number, bi: any) => sum + (bi.inventoryItem?.price ?? 0) * bi.quantity, 0);
            const savings = originalPrice - bundle.price;
            const canEdit = isAdmin || bundle.status === 'PENDING' || bundle.status === 'REJECTED';
            const canApprove = isAdmin && bundle.status === 'PENDING';
            const canActivate = isAdmin && (bundle.status === 'APPROVED' || bundle.status === 'INACTIVE');
            const canDeactivate = isAdmin && bundle.status === 'ACTIVE';
            const canDelete = isAdmin && (bundle.status === 'PENDING' || bundle.status === 'REJECTED');
            const statusStyle = STATUS_COLORS[bundle.status] ?? STATUS_COLORS.PENDING;

            return (
              <div key={bundle.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[16px] font-semibold text-[#323B42] line-clamp-2 flex-1">{bundle.name}</h3>
                    <span className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                      {STATUS_LABEL[bundle.status] ?? bundle.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef3c6] text-[#bb4d00]">{bundle.discount}% OFF</span>
                    <span className="text-[11px] text-[#6b7280]">{(bundle.items ?? []).length} {(bundle.items ?? []).length === 1 ? 'item' : 'items'}</span>
                  </div>
                </div>

                <div className="border-t border-[rgba(0,0,0,0.1)] pt-3 mb-3 flex-1">
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {(bundle.items ?? []).map((bi: any) => (
                      <div key={bi.id} className="flex justify-between text-[12px] gap-2">
                        <span className="text-[#323B42] line-clamp-1 flex-1">{bi.inventoryItem?.name ?? 'Unknown'} × {bi.quantity}</span>
                        <span className="text-[#6b7280] shrink-0">₱{((bi.inventoryItem?.price ?? 0) * bi.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[rgba(0,0,0,0.1)] pt-3 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[#6b7280]">Original Price:</span>
                    <span className="text-[13px] text-[#6b7280] line-through">₱{originalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold text-[#323B42]">Bundle Price:</span>
                    <span className="text-[22px] font-bold text-[#007A5E]">₱{bundle.price.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-[#00a63e] font-medium text-right">You save ₱{savings.toLocaleString()}</p>
                </div>

                <div className="border-t border-[rgba(0,0,0,0.05)] pt-3 mb-3">
                  <p className="text-[11px] text-[#6b7280] truncate">
                    Created: {new Date(bundle.createdAt).toLocaleDateString()} by {bundle.createdBy?.name ?? 'N/A'}
                  </p>
                  {bundle.approvedBy && bundle.approvedAt && (
                    <p className="text-[10px] text-[#00a63e] truncate">
                      Approved by {bundle.approvedBy.name} on {new Date(bundle.approvedAt).toLocaleDateString()}
                    </p>
                  )}
                  {bundle.rejectionReason && (
                    <p className="text-[10px] text-[#E7000B] mt-1 line-clamp-2">Rejected: {bundle.rejectionReason}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => canEdit && openEditModal(bundle)}
                    disabled={!canEdit || saving}
                    className={`px-3 py-2 border rounded-[6px] text-[12px] font-medium flex items-center justify-center gap-1 transition-colors ${canEdit ? 'border-[rgba(0,0,0,0.1)] text-[#323B42] hover:bg-[#F8FAFB] cursor-pointer' : 'border-[rgba(0,0,0,0.05)] text-[#9ca3af] bg-[#f9fafb] cursor-not-allowed'}`}
                  >
                    <Edit2 className="size-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => canDelete && handleDeleteBundle(bundle.id)}
                    disabled={!canDelete || saving}
                    className={`px-3 py-2 border rounded-[6px] text-[12px] font-medium flex items-center justify-center gap-1 transition-colors ${canDelete ? 'border-[#E7000B] text-[#E7000B] hover:bg-[#ffe2e2] cursor-pointer' : 'border-[rgba(0,0,0,0.05)] text-[#9ca3af] bg-[#f9fafb] cursor-not-allowed'}`}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                  {isAdmin && (
                    <>
                      {canApprove && (
                        <button onClick={() => { setSelectedBundle(bundle); setShowApprovalModal(true); }} disabled={saving} className="col-span-2 px-3 py-2 bg-[#155DFC] text-white rounded-[6px] text-[12px] font-medium hover:bg-[#1248d3] transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                          <CheckCircle className="size-3.5" />
                          Review Bundle
                        </button>
                      )}
                      {canActivate && (
                        <button onClick={() => handleActivateBundle(bundle.id)} disabled={saving} className="col-span-2 px-3 py-2 bg-[#00a63e] text-white rounded-[6px] text-[12px] font-medium hover:bg-[#008a34] transition-colors disabled:opacity-50">
                          Activate Bundle
                        </button>
                      )}
                      {canDeactivate && (
                        <button onClick={() => handleDeactivateBundle(bundle.id)} disabled={saving} className="col-span-2 px-3 py-2 bg-[#6b7280] text-white rounded-[6px] text-[12px] font-medium hover:bg-[#5a5f6d] transition-colors disabled:opacity-50">
                          Deactivate Bundle
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// Transfers and Adjustments View
