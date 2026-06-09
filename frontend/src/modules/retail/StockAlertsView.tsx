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


export interface StockAlert {
  id: string;
  itemName: string;
  currentStock: number;
  threshold: number;
  severity: 'low' | 'critical';
}

export function StockAlertsView({ alerts, inventory }: { alerts: StockAlert[]; inventory: InventoryItem[] }) {
  const [activeTab, setActiveTab] = useState<'low-stock' | 'stock-control' | 'bad-condition'>('low-stock');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'category'>('quantity');

  // Calculate statistics
  const availableStock = inventory.filter(item => item.condition !== 'Damaged').reduce((sum, item) => sum + item.quantity, 0);
  const stockValue = inventory
    .filter(item => item.condition !== 'Damaged')
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const uniqueCategories = new Set(inventory.map(item => item.category)).size;

  const lowStockCount = alerts.length;
  const stockControlCount = inventory.filter(item => item.condition !== 'Damaged').length;
  const badConditionCount = inventory.filter(item => item.condition === 'Damaged').length;

  // Get low stock items with details
  const lowStockItems = useMemo(() => {
    return alerts.map(alert => {
      const item = inventory.find(i => i.id === alert.id);
      return item ? { ...item, alert } : null;
    }).filter(Boolean) as (InventoryItem & { alert: StockAlert })[];
  }, [alerts, inventory]);

  // Get damaged items
  const damagedItems = useMemo(() => {
    return inventory.filter(item => item.condition === 'Damaged');
  }, [inventory]);

  // Get all categories
  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(inventory.map(item => item.category)))];
  }, [inventory]);

  // Filter and sort low stock items
  const filteredLowStockItems = useMemo(() => {
    let filtered = lowStockItems;

    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'quantity') return a.quantity - b.quantity;
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });
  }, [lowStockItems, filterCategory, sortBy]);

  // Filter stock control items
  const filteredStockItems = useMemo(() => {
    let filtered = inventory.filter(item => item.condition !== 'Damaged');

    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'quantity') return a.quantity - b.quantity;
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });
  }, [inventory, filterCategory, sortBy]);

  // Filter damaged items
  const filteredDamagedItems = useMemo(() => {
    let filtered = damagedItems;

    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return 0;
    });
  }, [damagedItems, filterCategory, sortBy]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">Stock Controls & Alerts</h2>
          <p className="text-[#323B42] text-[14px] mt-1">Monitor inventory levels and stock health</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[#323B42] text-[14px] mb-1">Available Stock</p>
              <p className="text-[#323B42] text-[30px] font-bold">{availableStock}</p>
            </div>
            <div className="bg-[#E0F2F2] rounded-full size-[48px] flex items-center justify-center">
              <Package className="size-6 text-[#007A5E]" />
            </div>
          </div>
          <p className="text-[#323B42] text-[12px]">pieces</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[#323B42] text-[14px] mb-1">Stock Value</p>
              <p className="text-[#323B42] text-[30px] font-bold">â‚±{stockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-[#E0F5F1] rounded-full size-[48px] flex items-center justify-center">
              <svg className="size-6" fill="none" viewBox="0 0 24 24">
                <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="#008967" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <p className="text-[#323B42] text-[12px]">total inventory value</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[#323B42] text-[14px] mb-1">Categories</p>
              <p className="text-[#323B42] text-[30px] font-bold">{uniqueCategories}</p>
            </div>
            <div className="bg-[#fef3c6] rounded-full size-[48px] flex items-center justify-center">
              <svg className="size-6" fill="none" viewBox="0 0 24 24">
                <path d="M3 7V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H7M17 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V7M21 17V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H17M7 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V17" stroke="#FFA500" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <p className="text-[#323B42] text-[12px]">active categories</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] overflow-hidden">
        <div className="flex border-b border-[rgba(0,0,0,0.1)]">
          <button
            onClick={() => setActiveTab('low-stock')}
            className={`flex items-center gap-2 px-6 py-3 text-[16px] font-medium transition-colors relative ${
              activeTab === 'low-stock'
                ? 'bg-[#fffbeb] text-[#FFA500]'
                : 'text-[#323B42] hover:bg-[#F8FAFB]'
            }`}
          >
            {activeTab === 'low-stock' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FFA500]" />
            )}
            <AlertTriangle className="size-5" style={{ color: activeTab === 'low-stock' ? '#FFA500' : '#323B42' }} />
            Low Stock Alerts
            <span className={`px-2 py-0.5 rounded text-[12px] font-semibold ${
              activeTab === 'low-stock'
                ? 'bg-[#fef3c6] text-[#bb4d00]'
                : 'bg-[#F8FAFB] text-[#323B42]'
            }`}>
              {lowStockCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('stock-control')}
            className={`flex items-center gap-2 px-6 py-3 text-[16px] font-medium transition-colors relative ${
              activeTab === 'stock-control'
                ? 'bg-[#eff6ff] text-[#007A5E]'
                : 'text-[#323B42] hover:bg-[#F8FAFB]'
            }`}
          >
            {activeTab === 'stock-control' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#007A5E]" />
            )}
            <Package className="size-5" style={{ color: activeTab === 'stock-control' ? '#007A5E' : '#323B42' }} />
            Stock Control
            <span className={`px-2 py-0.5 rounded text-[12px] font-semibold ${
              activeTab === 'stock-control'
                ? 'bg-[#E0F2F2] text-[#007A5E]'
                : 'bg-[#F8FAFB] text-[#323B42]'
            }`}>
              {stockControlCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('bad-condition')}
            className={`flex items-center gap-2 px-6 py-3 text-[16px] font-medium transition-colors relative ${
              activeTab === 'bad-condition'
                ? 'bg-[#fef2f2] text-[#991b1b]'
                : 'text-[#323B42] hover:bg-[#F8FAFB]'
            }`}
          >
            {activeTab === 'bad-condition' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#991b1b]" />
            )}
            <svg className="size-5" fill="none" viewBox="0 0 20 20">
              <path d="M10 2.5L2.5 6.66667V13.3333C2.5 13.7754 2.67559 14.1993 2.98816 14.5118C3.30072 14.8244 3.72464 15 4.16667 15H15.8333C16.2754 15 16.6993 14.8244 17.0118 14.5118C17.3244 14.1993 17.5 13.7754 17.5 13.3333V6.66667L10 2.5Z" stroke={activeTab === 'bad-condition' ? '#991b1b' : '#323B42'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d="M10 15V8.33333" stroke={activeTab === 'bad-condition' ? '#991b1b' : '#323B42'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d="M2.5 6.66667L10 10.8333L17.5 6.66667" stroke={activeTab === 'bad-condition' ? '#991b1b' : '#323B42'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </svg>
            Bad Condition
            <span className={`px-2 py-0.5 rounded text-[12px] font-semibold ${
              activeTab === 'bad-condition'
                ? 'bg-[#ffe2e2] text-[#E7000B]'
                : 'bg-[#F8FAFB] text-[#323B42]'
            }`}>
              {badConditionCount}
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#F8FAFB] border-b border-[rgba(0,0,0,0.1)] px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[14px] text-[#323B42] font-medium">Category:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[14px] bg-white focus:outline-none focus:border-[#007A5E]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[14px] text-[#323B42] font-medium">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'category')}
              className="px-3 py-1.5 border border-[rgba(0,0,0,0.1)] rounded-[6px] text-[14px] bg-white focus:outline-none focus:border-[#007A5E]"
            >
              <option value="quantity">Stock Level</option>
              <option value="name">Name</option>
              <option value="category">Category</option>
            </select>
          </div>
          <div className="ml-auto text-[14px] text-[#323B42]">
            {activeTab === 'low-stock' && `Showing ${filteredLowStockItems.length} of ${lowStockCount} items`}
            {activeTab === 'stock-control' && `Showing ${filteredStockItems.length} of ${stockControlCount} items`}
            {activeTab === 'bad-condition' && `Showing ${filteredDamagedItems.length} of ${badConditionCount} items`}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'low-stock' && (
            <div>
              {filteredLowStockItems.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="bg-[#E0F5F1] rounded-full size-[64px] flex items-center justify-center mb-4 mx-auto">
                    <svg className="size-8 text-[#008967]" fill="none" viewBox="0 0 24 24">
                      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <p className="text-[#323B42] text-[18px] font-medium">No low stock alerts</p>
                  <p className="text-[#323B42] text-[14px] mt-1">All items are well stocked</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLowStockItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 px-4 py-4 rounded-[8px] border transition-colors ${
                        item.alert.severity === 'critical'
                          ? 'bg-[#fff5f5] border-[#ffe2e2] hover:bg-[#ffefef]'
                          : 'bg-[#fffbf0] border-[#fef3c6] hover:bg-[#fff8e7]'
                      }`}
                    >
                      {/* Alert Icon */}
                      <div className={`rounded-full size-[48px] flex items-center justify-center shrink-0 ${
                        item.alert.severity === 'critical' ? 'bg-[#ffe2e2]' : 'bg-[#fef3c6]'
                      }`}>
                        <AlertTriangle className="size-6" style={{ color: item.alert.severity === 'critical' ? '#E7000B' : '#FFA500' }} />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1">
                        <p className="text-[16px] font-semibold text-[#323B42]">{item.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[13px] text-[#323B42]">
                            <span className="font-medium text-[#323B42]">{item.category}</span> / {item.subcategory}
                          </span>
                          <span className="text-[13px] text-[#323B42]">â€¢</span>
                          <span className="text-[13px] text-[#323B42]">Size: {item.size}</span>
                          <span className="text-[13px] text-[#323B42]">â€¢</span>
                          <span className="text-[13px] text-[#323B42]">{item.location}</span>
                        </div>
                      </div>

                      {/* Stock Level */}
                      <div className="text-center px-4">
                        <p className={`text-[24px] font-bold ${
                          item.alert.severity === 'critical' ? 'text-[#E7000B]' : 'text-[#FFA500]'
                        }`}>
                          {item.quantity}
                        </p>
                        <p className="text-[12px] text-[#323B42]">in stock</p>
                      </div>

                      {/* Price */}
                      <div className="text-center px-4 border-l border-[rgba(0,0,0,0.1)]">
                        <p className="text-[16px] font-semibold text-[#323B42]">â‚±{item.price}</p>
                        <p className="text-[12px] text-[#323B42]">per item</p>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-3 py-1.5 rounded-[6px] text-[13px] font-semibold shrink-0 ${
                        item.alert.severity === 'critical'
                          ? 'bg-[#E7000B] text-white'
                          : 'bg-[#FFA500] text-white'
                      }`}>
                        {item.alert.severity === 'critical' ? 'Critical' : 'Low Stock'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stock-control' && (
            <div>
              {filteredStockItems.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[#323B42] text-[18px] font-medium">No items found</p>
                  <p className="text-[#323B42] text-[14px] mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStockItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 px-4 py-4 rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-white hover:bg-[#F8FAFB] transition-colors"
                    >
                      {/* Item Icon */}
                      <div className="rounded-full size-[48px] flex items-center justify-center shrink-0 bg-[#E0F2F2]">
                        <Package className="size-6 text-[#007A5E]" />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1">
                        <p className="text-[16px] font-semibold text-[#323B42]">{item.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[13px] text-[#323B42]">
                            <span className="font-medium text-[#323B42]">{item.category}</span> / {item.subcategory}
                          </span>
                          <span className="text-[13px] text-[#323B42]">â€¢</span>
                          <span className="text-[13px] text-[#323B42]">Size: {item.size}</span>
                          <span className="text-[13px] text-[#323B42]">â€¢</span>
                          <span className={`text-[13px] px-2 py-0.5 rounded ${
                            item.condition === 'Excellent' ? 'bg-[#E0F5F1] text-[#008967]' :
                            item.condition === 'Good' ? 'bg-[#E0F2F2] text-[#007A5E]' :
                            'bg-[#fef3c6] text-[#92400e]'
                          }`}>
                            {item.condition}
                          </span>
                        </div>
                      </div>

                      {/* Stock Level */}
                      <div className="text-center px-4">
                        <p className="text-[24px] font-bold text-[#323B42]">{item.quantity}</p>
                        <p className="text-[12px] text-[#323B42]">in stock</p>
                      </div>

                      {/* Price & Value */}
                      <div className="text-right px-4 border-l border-[rgba(0,0,0,0.1)]">
                        <p className="text-[16px] font-semibold text-[#323B42]">â‚±{(item.price * item.quantity).toLocaleString()}</p>
                        <p className="text-[12px] text-[#323B42]">â‚±{item.price} Ã— {item.quantity}</p>
                      </div>

                      {/* Location */}
                      <div className="text-center px-4 border-l border-[rgba(0,0,0,0.1)] min-w-[100px]">
                        <p className="text-[13px] font-medium text-[#323B42]">{item.location}</p>
                        <p className="text-[11px] text-[#323B42]">location</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bad-condition' && (
            <div>
              {filteredDamagedItems.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="bg-[#E0F5F1] rounded-full size-[64px] flex items-center justify-center mb-4 mx-auto">
                    <svg className="size-8 text-[#008967]" fill="none" viewBox="0 0 24 24">
                      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <p className="text-[#323B42] text-[18px] font-medium">No damaged items</p>
                  <p className="text-[#323B42] text-[14px] mt-1">All items are in good condition</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDamagedItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 px-4 py-4 rounded-[8px] border border-[#ffe2e2] bg-[#fff5f5] hover:bg-[#ffefef] transition-colors"
                    >
                      {/* Damage Icon */}
                      <div className="rounded-full size-[48px] flex items-center justify-center shrink-0 bg-[#ffe2e2]">
                        <svg className="size-6" fill="none" viewBox="0 0 24 24">
                          <path d="M12 2L2 7V17C2 17.5304 2.21071 18.0391 2.58579 18.4142C2.96086 18.7893 3.46957 19 4 19H20C20.5304 19 21.0391 18.7893 21.4142 18.4142C21.7893 18.0391 22 17.5304 22 17V7L12 2Z" stroke="#E7000B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          <path d="M12 19V9" stroke="#E7000B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          <path d="M2 7L12 12L22 7" stroke="#E7000B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          <path d="M16 11L20 13" stroke="#E7000B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          <path d="M4 13L8 11" stroke="#E7000B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </div>

                      {/* Item Details */}
                      <div className="flex-1">
                        <p className="text-[16px] font-semibold text-[#323B42]">{item.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[13px] text-[#323B42]">
                            <span className="font-medium text-[#323B42]">{item.category}</span> / {item.subcategory}
                          </span>
                          <span className="text-[13px] text-[#323B42]">â€¢</span>
                          <span className="text-[13px] text-[#323B42]">Size: {item.size}</span>
                          <span className="text-[13px] text-[#323B42]">â€¢</span>
                          <span className="text-[13px] text-[#323B42]">{item.location}</span>
                          <span className="text-[13px] text-[#323B42]">â€¢</span>
                          <span className="text-[13px] text-[#323B42]">Added: {item.dateAdded}</span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="text-center px-4">
                        <p className="text-[24px] font-bold text-[#E7000B]">{item.quantity}</p>
                        <p className="text-[12px] text-[#323B42]">damaged</p>
                      </div>

                      {/* Original Price */}
                      <div className="text-center px-4 border-l border-[rgba(0,0,0,0.1)]">
                        <p className="text-[16px] font-semibold text-[#323B42] line-through">â‚±{item.price}</p>
                        <p className="text-[12px] text-[#323B42]">original</p>
                      </div>

                      {/* Status Badge */}
                      <span className="px-3 py-1.5 rounded-[6px] text-[13px] font-semibold shrink-0 bg-[#E7000B] text-white">
                        Damaged
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Refresh Icon

// Inventory View
