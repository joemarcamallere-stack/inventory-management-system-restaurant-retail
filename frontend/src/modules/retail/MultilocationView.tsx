import { useState, useMemo } from 'react';
import { Plus, Edit2, X, Search, MapPin, Package, ArrowRightLeft, ShoppingCart, TrendingUp, TrendingDown, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Location, InventoryItem, Transfer, PurchaseOrder } from '../../app/utils/generateSampleData';
import {
  useCreateRetailLocationMutation,
  useDeleteRetailLocationMutation,
  useUpdateRetailLocationMutation,
} from '../lib/retailQueries';

export default function MultilocationView({
  locations,
  inventory,
  transfers,
  purchaseOrders
}: {
  locations: Location[];
  inventory: InventoryItem[];
  transfers: Transfer[];
  purchaseOrders: PurchaseOrder[];
}) {
  const addLocation = useCreateRetailLocationMutation();
  const editLocation = useUpdateRetailLocationMutation();
  const removeLocation = useDeleteRetailLocationMutation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    manager: '',
    phone: ''
  });

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.manager.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddLocation = async () => {
    if (!locationForm.name || !locationForm.address || !locationForm.manager || !locationForm.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await addLocation.mutateAsync(locationForm);
      setLocationForm({ name: '', address: '', manager: '', phone: '' });
      setShowAddModal(false);
      toast.success('Location created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create location');
    }
  };

  const handleEditLocation = async () => {
    if (!selectedLocation || !locationForm.name || !locationForm.address || !locationForm.manager || !locationForm.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await editLocation.mutateAsync({ id: selectedLocation.id, data: locationForm });

      setLocationForm({ name: '', address: '', manager: '', phone: '' });
      setSelectedLocation(null);
      setShowEditModal(false);
      toast.success('Location updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update location');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    const locationItems = inventory.filter(item => item.location === location?.name);

    if (locationItems.length > 0) {
      toast.error(`Cannot delete ${location?.name}. There are ${locationItems.length} items at this location. Please transfer or remove items first.`);
      return;
    }

    if (confirm(`Delete ${location?.name}?`)) {
      try {
        await removeLocation.mutateAsync(locationId);
        toast.success('Location deleted successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete location');
      }
    }
  };

  const openEditModal = (location: Location) => {
    setSelectedLocation(location);
    setLocationForm({
      name: location.name,
      address: location.address,
      manager: location.manager,
      phone: location.phone
    });
    setShowEditModal(true);
  };

  const openDetailsModal = (location: Location) => {
    setSelectedLocation(location);
    setShowDetailsModal(true);
  };

  const getLocationStats = (locationName: string) => {
    const locationItems = inventory.filter(item => item.location === locationName);
    const totalItems = locationItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = locationItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const uniqueItems = locationItems.length;
    const lowStockItems = locationItems.filter(item => item.quantity <= 3 && item.condition !== 'Damaged').length;

    // Get category breakdown
    const categoryBreakdown = locationItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Get incoming transfers
    const incomingTransfers = transfers.filter(t =>
      t.toLocation === locationName && (t.status === 'Pending' || t.status === 'In Transit')
    ).length;

    // Get outgoing transfers
    const outgoingTransfers = transfers.filter(t =>
      t.fromLocation === locationName && (t.status === 'Pending' || t.status === 'In Transit')
    ).length;

    return {
      totalItems,
      totalValue,
      uniqueItems,
      lowStockItems,
      categoryBreakdown,
      incomingTransfers,
      outgoingTransfers
    };
  };

  // Calculate overall stats
  const overallStats = {
    totalLocations: locations.length,
    totalInventoryValue: locations.reduce((sum, loc) => {
      const stats = getLocationStats(loc.name);
      return sum + stats.totalValue;
    }, 0),
    totalItems: locations.reduce((sum, loc) => {
      const stats = getLocationStats(loc.name);
      return sum + stats.totalItems;
    }, 0),
    activeTransfers: transfers.filter(t => t.status === 'Pending' || t.status === 'In Transit').length
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">Multi-Location Management</h2>
          <p className="text-[#323B42] text-[14px] mt-1">Manage inventory across multiple locations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#008967] transition-colors"
        >
          <Plus className="size-4" />
          Add Location
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#323B42] text-[12px]">Total Locations</p>
            <MapPin className="size-5 text-[#007A5E]" />
          </div>
          <p className="text-[#323B42] text-[24px] font-bold">{overallStats.totalLocations}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#323B42] text-[12px]">Total Items</p>
            <Package className="size-5 text-[#008967]" />
          </div>
          <p className="text-[#323B42] text-[24px] font-bold">{overallStats.totalItems}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#323B42] text-[12px]">Total Value</p>
            <TrendingUp className="size-5 text-[#00A7A5]" />
          </div>
          <p className="text-[#007A5E] text-[24px] font-bold">â‚±{(overallStats.totalInventoryValue / 1000).toFixed(1)}K</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#323B42] text-[12px]">Active Transfers</p>
            <ArrowRightLeft className="size-5 text-[#FFA500]" />
          </div>
          <p className="text-[#323B42] text-[24px] font-bold">{overallStats.activeTransfers}</p>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] mb-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Search className="size-5 text-[#6b7280]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search locations..."
              className="flex-1 text-[14px] focus:outline-none text-[#323B42]"
            />
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-[6px] ${viewMode === 'grid' ? 'bg-[#007A5E] text-white' : 'bg-[#F8FAFB] text-[#323B42]'}`}
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-[6px] ${viewMode === 'list' ? 'bg-[#007A5E] text-white' : 'bg-[#F8FAFB] text-[#323B42]'}`}
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Locations */}
      {filteredLocations.length === 0 ? (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
          <MapPin className="size-16 text-[#d1d5dc] mx-auto mb-4" />
          <p className="text-[16px] text-[#323B42] font-medium">No locations found</p>
          <p className="text-[14px] text-[#6b7280] mt-1">Add your first location to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-6">
          {filteredLocations.map(location => {
            const stats = getLocationStats(location.name);

            return (
              <div key={location.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-[#E0F2F2] rounded-full size-[48px] flex items-center justify-center">
                    <MapPin className="size-6 text-[#007A5E]" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(location)}
                      className="p-2 hover:bg-[#E0F2F2] rounded-[6px] text-[#007A5E] transition-colors"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className="p-2 hover:bg-[#ffe2e2] rounded-[6px] text-[#E7000B] transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-[18px] font-semibold text-[#323B42] mb-2">{location.name}</h3>
                <p className="text-[13px] text-[#6b7280] mb-1 flex items-center gap-1">
                  <MapPin className="size-3" />
                  {location.address}
                </p>
                <p className="text-[13px] text-[#6b7280] mb-1 flex items-center gap-1">
                  <Users className="size-3" />
                  {location.manager}
                </p>
                <p className="text-[13px] text-[#6b7280] mb-4 flex items-center gap-1">
                  <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {location.phone}
                </p>

                <div className="border-t border-[rgba(0,0,0,0.1)] pt-4 mb-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[#6b7280]">Total Items:</span>
                    <span className="text-[13px] font-semibold text-[#323B42]">{stats.totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[#6b7280]">Unique Items:</span>
                    <span className="text-[13px] font-semibold text-[#323B42]">{stats.uniqueItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-[#6b7280]">Stock Value:</span>
                    <span className="text-[13px] font-semibold text-[#007A5E]">â‚±{stats.totalValue.toLocaleString()}</span>
                  </div>
                  {stats.lowStockItems > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[13px] text-[#6b7280]">Low Stock:</span>
                      <span className="text-[13px] font-semibold text-[#FFA500]">{stats.lowStockItems} items</span>
                    </div>
                  )}
                </div>

                {(stats.incomingTransfers > 0 || stats.outgoingTransfers > 0) && (
                  <div className="bg-[#F8FAFB] rounded-[8px] p-3 mb-4">
                    <p className="text-[12px] text-[#6b7280] mb-1">Active Transfers:</p>
                    <div className="flex items-center justify-between text-[13px]">
                      {stats.incomingTransfers > 0 && (
                        <span className="text-[#008967]">â†“ {stats.incomingTransfers} incoming</span>
                      )}
                      {stats.outgoingTransfers > 0 && (
                        <span className="text-[#FFA500]">â†‘ {stats.outgoingTransfers} outgoing</span>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => openDetailsModal(location)}
                  className="w-full px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
                >
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLocations.map(location => {
            const stats = getLocationStats(location.name);

            return (
              <div key={location.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="bg-[#E0F2F2] rounded-full size-[56px] flex items-center justify-center">
                      <MapPin className="size-7 text-[#007A5E]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[20px] font-semibold text-[#323B42] mb-2">{location.name}</h3>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-[13px] text-[#6b7280] mb-1">Address: {location.address}</p>
                          <p className="text-[13px] text-[#6b7280] mb-1">Manager: {location.manager}</p>
                          <p className="text-[13px] text-[#6b7280]">Phone: {location.phone}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#F8FAFB] rounded-[8px] p-3">
                            <p className="text-[11px] text-[#6b7280]">Total Items</p>
                            <p className="text-[18px] font-bold text-[#323B42]">{stats.totalItems}</p>
                          </div>
                          <div className="bg-[#F8FAFB] rounded-[8px] p-3">
                            <p className="text-[11px] text-[#6b7280]">Unique Items</p>
                            <p className="text-[18px] font-bold text-[#323B42]">{stats.uniqueItems}</p>
                          </div>
                          <div className="bg-[#F8FAFB] rounded-[8px] p-3">
                            <p className="text-[11px] text-[#6b7280]">Stock Value</p>
                            <p className="text-[18px] font-bold text-[#007A5E]">â‚±{(stats.totalValue / 1000).toFixed(1)}K</p>
                          </div>
                          <div className="bg-[#F8FAFB] rounded-[8px] p-3">
                            <p className="text-[11px] text-[#6b7280]">Low Stock</p>
                            <p className="text-[18px] font-bold text-[#FFA500]">{stats.lowStockItems}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openDetailsModal(location)}
                      className="px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => openEditModal(location)}
                      className="p-2 hover:bg-[#E0F2F2] rounded-[6px] text-[#007A5E] transition-colors"
                    >
                      <Edit2 className="size-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className="p-2 hover:bg-[#ffe2e2] rounded-[6px] text-[#E7000B] transition-colors"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[24px] font-bold text-[#323B42]">Add New Location</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setLocationForm({ name: '', address: '', manager: '', phone: '' });
                }}
                className="p-2 hover:bg-[#F8FAFB] rounded"
              >
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Location Name *</label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  placeholder="e.g., Branch 2"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Address *</label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  placeholder="e.g., 123 Main Street, City"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Manager Name *</label>
                <input
                  type="text"
                  value={locationForm.manager}
                  onChange={(e) => setLocationForm({ ...locationForm, manager: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  placeholder="e.g., John Doe"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={locationForm.phone}
                  onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  placeholder="e.g., +63 912 345 6789"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setLocationForm({ name: '', address: '', manager: '', phone: '' });
                }}
                className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLocation}
                className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
              >
                Add Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && selectedLocation && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[24px] font-bold text-[#323B42]">Edit Location</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLocation(null);
                  setLocationForm({ name: '', address: '', manager: '', phone: '' });
                }}
                className="p-2 hover:bg-[#F8FAFB] rounded"
              >
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Location Name *</label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Address *</label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Manager Name *</label>
                <input
                  type="text"
                  value={locationForm.manager}
                  onChange={(e) => setLocationForm({ ...locationForm, manager: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={locationForm.phone}
                  onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLocation(null);
                  setLocationForm({ name: '', address: '', manager: '', phone: '' });
                }}
                className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditLocation}
                className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Details Modal */}
      {showDetailsModal && selectedLocation && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-[#E0F2F2] rounded-full size-[56px] flex items-center justify-center">
                  <MapPin className="size-7 text-[#007A5E]" />
                </div>
                <div>
                  <h3 className="text-[24px] font-bold text-[#323B42]">{selectedLocation.name}</h3>
                  <p className="text-[14px] text-[#6b7280]">{selectedLocation.address}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLocation(null);
                }}
                className="p-2 hover:bg-[#F8FAFB] rounded"
              >
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            {(() => {
              const stats = getLocationStats(selectedLocation.name);
              const locationItems = inventory.filter(item => item.location === selectedLocation.name);
              const locationTransfers = transfers.filter(t =>
                (t.fromLocation === selectedLocation.name || t.toLocation === selectedLocation.name) &&
                (t.status === 'Pending' || t.status === 'In Transit')
              );

              return (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#F8FAFB] rounded-[12px] p-4">
                      <p className="text-[12px] text-[#6b7280] mb-1">Total Items</p>
                      <p className="text-[24px] font-bold text-[#323B42]">{stats.totalItems}</p>
                    </div>
                    <div className="bg-[#F8FAFB] rounded-[12px] p-4">
                      <p className="text-[12px] text-[#6b7280] mb-1">Unique Items</p>
                      <p className="text-[24px] font-bold text-[#323B42]">{stats.uniqueItems}</p>
                    </div>
                    <div className="bg-[#F8FAFB] rounded-[12px] p-4">
                      <p className="text-[12px] text-[#6b7280] mb-1">Stock Value</p>
                      <p className="text-[24px] font-bold text-[#007A5E]">â‚±{stats.totalValue.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#F8FAFB] rounded-[12px] p-4">
                      <p className="text-[12px] text-[#6b7280] mb-1">Low Stock Items</p>
                      <p className="text-[24px] font-bold text-[#FFA500]">{stats.lowStockItems}</p>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="mb-6">
                    <h4 className="text-[18px] font-semibold text-[#323B42] mb-4">Category Breakdown</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                        <div key={category} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] p-3 flex items-center justify-between">
                          <span className="text-[14px] text-[#323B42]">{category}</span>
                          <span className="text-[14px] font-semibold text-[#007A5E]">{count} items</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Transfers */}
                  {locationTransfers.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-[18px] font-semibold text-[#323B42] mb-4">Active Transfers</h4>
                      <div className="space-y-3">
                        {locationTransfers.map(transfer => (
                          <div key={transfer.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-semibold text-[#323B42]">{transfer.transferNumber}</span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  transfer.status === 'Pending' ? 'bg-[#fff4e6] text-[#FFA500]' : 'bg-[#E0F2F2] text-[#007A5E]'
                                }`}>
                                  {transfer.status}
                                </span>
                              </div>
                              <span className="text-[13px] text-[#6b7280]">{transfer.items.length} items</span>
                            </div>
                            <div className="flex items-center gap-2 text-[13px] text-[#6b7280]">
                              <span className={transfer.fromLocation === selectedLocation.name ? 'text-[#E7000B]' : 'text-[#008967]'}>
                                {transfer.fromLocation}
                              </span>
                              <ArrowRightLeft className="size-3" />
                              <span className={transfer.toLocation === selectedLocation.name ? 'text-[#008967]' : 'text-[#E7000B]'}>
                                {transfer.toLocation}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Items */}
                  <div>
                    <h4 className="text-[18px] font-semibold text-[#323B42] mb-4">Top Items by Quantity</h4>
                    <div className="space-y-2">
                      {locationItems
                        .sort((a, b) => b.quantity - a.quantity)
                        .slice(0, 10)
                        .map(item => (
                          <div key={item.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] p-3 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                              <p className="text-[12px] text-[#6b7280]">{item.category} â€¢ {item.condition}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[14px] font-semibold text-[#007A5E]">{item.quantity}</p>
                              <p className="text-[12px] text-[#6b7280]">â‚±{item.price}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// User Management View
