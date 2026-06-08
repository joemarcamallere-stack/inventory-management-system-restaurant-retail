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

const formatDate = (value: string) => value ? new Date(value).toISOString().split('T')[0] : '';

const mapApiUser = (user: any): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  lastLogin: formatDate(user.lastLogin)
});
// Dashboard View
export function DashboardView({
  stats,
  stockAlerts,
  inventory,
  purchaseOrders,
  productsReceived
}: {
  stats: any;
  stockAlerts: StockAlert[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  productsReceived: ProductReceived[];
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Calculate additional stats
  const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const pendingPOs = purchaseOrders.filter(po => po.status === 'Pending' || po.status === 'Approved').length;
  const recentReceipts = productsReceived.slice(-5);

  const handleRefresh = () => {
    setIsRefreshing(true);

    // Simulate data refresh with animation
    setTimeout(() => {
      setLastRefreshed(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    inventory.forEach(item => {
      const count = categoryMap.get(item.category) || 0;
      categoryMap.set(item.category, count + item.quantity);
    });
    return Array.from(categoryMap.entries()).map(([name, value], index) => ({
      id: `${name}-${index}`,
      name,
      value
    }));
  }, [inventory]);

  // Stock trend by month (simulated)
  const stockTrendData = useMemo(() => {
    return [
      { month: 'Jan', stock: 320 },
      { month: 'Feb', stock: 380 },
      { month: 'Mar', stock: 420 },
      { month: 'Apr', stock: 460 },
      { month: 'May', stock: stats.totalItems - 20 },
      { month: 'Jun', stock: stats.totalItems }
    ];
  }, [stats.totalItems]);

  // Condition breakdown for bar chart
  const conditionData = useMemo(() => {
    const conditionMap = { Excellent: 0, Good: 0, Fair: 0, Damaged: 0 };
    inventory.forEach(item => {
      conditionMap[item.condition] += item.quantity;
    });
    return Object.entries(conditionMap).map(([condition, count]) => ({ condition, count }));
  }, [inventory]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42] leading-[36px]">Dashboard</h2>
          <p className="text-[14px] text-[#6b7280] mt-1">
            Overview of your inventory system
            {!isRefreshing && (
              <span className="ml-2 text-[12px] text-[#6b7280]">
                â€¢ Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white border border-[rgba(0,0,0,0.1)] text-[#323B42] px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#F8FAFB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Items"
          value={stats.totalItems}
          change={stats.itemsChange}
          color="#ffedd4"
          iconColor="#F54900"
          icon={<Package className="size-6" />}
        />
        <StatCard
          title="Available Stock"
          value={stats.availableStock}
          change={stats.availableChange}
          color="#fef3c6"
          iconColor="#FFA500"
          icon={<Package className="size-6" />}
        />
        <StatCard
          title="Total Value"
          value={`â‚±${(totalValue / 1000).toFixed(1)}K`}
          subtitle="Inventory worth"
          color="#E0F5F1"
          iconColor="#008967"
          icon={<TrendingUp className="size-6" />}
        />
        <StatCard
          title="Low Stock Alerts"
          value={stockAlerts.length}
          subtitle="Requires attention"
          color="#ffe2e2"
          iconColor="#E7000B"
          isWarning
          icon={<AlertTriangle className="size-6" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Stock Trend Chart */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <h3 className="text-[18px] font-semibold text-[#323B42] mb-4">Stock Trend (2026)</h3>
          <LineChart width={400} height={250} data={stockTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" key="grid-trend" />
            <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} key="xaxis-trend" />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} key="yaxis-trend" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              labelStyle={{ color: '#323B42', fontWeight: 600 }}
              key="tooltip-trend"
            />
            <Line type="monotone" dataKey="stock" stroke="#007A5E" strokeWidth={2} dot={{ fill: '#007A5E', r: 4 }} key="line-trend" />
          </LineChart>
        </div>

        {/* Category Distribution Chart */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <h3 className="text-[18px] font-semibold text-[#323B42] mb-4">Inventory by Category</h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <PieChart width={200} height={200}>
                <Pie
                  data={categoryData}
                  cx={100}
                  cy={100}
                  labelLine={false}
                  label={false}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`pie-cell-${entry.id}-${entry.name}`}
                      fill={['#007A5E', '#155DFC', '#FFA500', '#E7000B', '#8B5CF6', '#EC4899'][index % 6]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
              <div className="flex-1 space-y-2">
                {categoryData.map((entry, index) => {
                  const total = categoryData.reduce((sum, item) => sum + item.value, 0);
                  const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={`legend-${entry.id}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: ['#007A5E', '#155DFC', '#FFA500', '#E7000B', '#8B5CF6', '#EC4899'][index % 6] }}
                        />
                        <span className="text-[13px] text-[#323B42]">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#6b7280]">{entry.value}</span>
                        <span className="text-[13px] font-semibold text-[#323B42]">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center text-[#6b7280] py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Condition Breakdown Chart */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <h3 className="text-[18px] font-semibold text-[#323B42] mb-4">Items by Condition</h3>
          <BarChart width={400} height={250} data={conditionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" key="grid-condition" />
            <XAxis dataKey="condition" stroke="#6b7280" style={{ fontSize: '12px' }} key="xaxis-condition" />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} key="yaxis-condition" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              key="tooltip-condition"
            />
            <Bar dataKey="count" fill="#007A5E" radius={[8, 8, 0, 0]} key="bar-condition" />
          </BarChart>
        </div>

        {/* Quick Stats Grid */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <h3 className="text-[18px] font-semibold text-[#323B42] mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
              <div className="flex items-center gap-3">
                <div className="bg-[#E0F2F2] rounded-full p-2">
                  <ShoppingCart className="size-5 text-[#007A5E]" />
                </div>
                <div>
                  <p className="text-[12px] text-[#6b7280]">Pending Purchase Orders</p>
                  <p className="text-[18px] font-bold text-[#323B42]">{pendingPOs}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
              <div className="flex items-center gap-3">
                <div className="bg-[#E0F5F1] rounded-full p-2">
                  <PackageCheck className="size-5 text-[#008967]" />
                </div>
                <div>
                  <p className="text-[12px] text-[#6b7280]">Products Received</p>
                  <p className="text-[18px] font-bold text-[#323B42]">{productsReceived.length}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
              <div className="flex items-center gap-3">
                <div className="bg-[#fff4e6] rounded-full p-2">
                  <Package className="size-5 text-[#F54900]" />
                </div>
                <div>
                  <p className="text-[12px] text-[#6b7280]">Unique Items</p>
                  <p className="text-[18px] font-bold text-[#323B42]">{inventory.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Receipts */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <h3 className="text-[18px] font-semibold text-[#323B42] mb-4">Recent Receipts</h3>
          {recentReceipts.length === 0 ? (
            <p className="text-[14px] text-[#6b7280] text-center py-8">No recent receipts</p>
          ) : (
            <div className="space-y-3">
              {recentReceipts.map(receipt => (
                <div key={receipt.id} className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                  <div>
                    <p className="text-[14px] font-medium text-[#323B42]">{receipt.receiptNumber}</p>
                    <p className="text-[12px] text-[#6b7280]">{receipt.supplier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-[#008967]">{receipt.totalAccepted} items</p>
                    <p className="text-[11px] text-[#6b7280]">{receipt.dateReceived}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <h3 className="text-[18px] font-semibold text-[#323B42] mb-4">Low Stock Alerts</h3>
          {stockAlerts.length === 0 ? (
            <p className="text-[14px] text-[#6b7280] text-center py-8">No low stock alerts</p>
          ) : (
            <div className="space-y-3">
              {stockAlerts.slice(0, 5).map(alert => {
                const item = inventory.find(i => i.id === alert.id);
                return item ? (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-[#fff4e6] rounded-[8px]">
                    <div>
                      <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                      <p className="text-[12px] text-[#6b7280]">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-[#FFA500]">{item.quantity} left</p>
                      <p className="text-[11px] text-[#6b7280]">Min: {alert.threshold}</p>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, change, subtitle, color, iconColor, isWarning, icon }: any) {
  return (
    <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[#323B42] text-[14px] leading-[20px] mb-1">{title}</p>
          <p className="text-[#323B42] text-[30px] font-bold leading-[36px]">{value}</p>
        </div>
        <div className="rounded-full size-[48px] flex items-center justify-center" style={{ backgroundColor: color, color: iconColor }}>
          {icon}
        </div>
      </div>
      {change !== undefined && !isWarning && (
        <div className="flex items-center gap-1">
          {change >= 0 ? <TrendingUp className="size-4 text-[#00a63e]" /> : <TrendingDown className="size-4 text-[#e7000b]" />}
          <span className={`text-[14px] font-medium ${change >= 0 ? 'text-[#00a63e]' : 'text-[#e7000b]'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        </div>
      )}
      {subtitle && (
        <p className="text-[#323B42] text-[12px] leading-[16px]">{subtitle}</p>
      )}
    </div>
  );
}

// Stock Alerts View
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
export function InventoryView({
  inventory,
  searchTerm,
  setSearchTerm,
  onEdit,
  onDelete,
  expandedCategories,
  expandedSubcategories,
  toggleCategory,
  toggleSubcategory,
  showEditModal,
  editingId,
  formData,
  setFormData,
  onSaveEdit,
  onCancelEdit,
  locations
}: any) {
  const [expandedTargetCustomers, setExpandedTargetCustomers] = useState<Set<string>>(new Set());
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set());

  const toggleTargetCustomer = (key: string) => {
    const newExpanded = new Set(expandedTargetCustomers);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTargetCustomers(newExpanded);
  };

  const toggleCondition = (key: string) => {
    const newExpanded = new Set(expandedConditions);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedConditions(newExpanded);
  };

  // Group items by category -> targetCustomer -> condition -> subcategory
  const groupedInventory = useMemo(() => {
    const grouped: {
      [category: string]: {
        [targetCustomer: string]: {
          [condition: string]: {
            [subcategory: string]: InventoryItem[]
          }
        }
      }
    } = {};

    inventory.forEach((item: InventoryItem) => {
      const targetCustomer = item.targetCustomer || 'Unisex';
      const condition = item.condition || 'Good';

      if (!grouped[item.category]) {
        grouped[item.category] = {};
      }
      if (!grouped[item.category][targetCustomer]) {
        grouped[item.category][targetCustomer] = {};
      }
      if (!grouped[item.category][targetCustomer][condition]) {
        grouped[item.category][targetCustomer][condition] = {};
      }
      if (!grouped[item.category][targetCustomer][condition][item.subcategory]) {
        grouped[item.category][targetCustomer][condition][item.subcategory] = [];
      }
      grouped[item.category][targetCustomer][condition][item.subcategory].push(item);
    });

    return grouped;
  }, [inventory]);

  const totalItems = inventory.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">Inventory</h2>
          <p className="text-[#323B42] text-[14px] mt-1">{totalItems} items total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#323B42] size-5" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] w-[300px] text-[14px] focus:outline-none focus:border-[#007A5E]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
        {Object.keys(groupedInventory).length === 0 ? (
          <div className="py-12 text-center text-[#323B42]">No items found</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedInventory).map(([category, targetCustomers]) => {
              const categoryItemCount = Object.values(targetCustomers)
                .flatMap(tc => Object.values(tc))
                .flatMap(c => Object.values(c))
                .flat().length;
              const isCategoryExpanded = expandedCategories.has(category);

              return (
                <div key={category}>
                  {/* Category Header - BIGGER */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#F8FAFB] rounded-[10px] transition-colors group border border-[rgba(0,0,0,0.05)]"
                  >
                    {isCategoryExpanded ? (
                      <ChevronDown className="size-6 text-[#323B42]" />
                    ) : (
                      <ChevronRight className="size-6 text-[#323B42]" />
                    )}
                    {isCategoryExpanded ? (
                      <FolderOpen className="size-7 text-[#007A5E]" />
                    ) : (
                      <Folder className="size-7 text-[#007A5E]" />
                    )}
                    <span className="text-[18px] font-bold text-[#323B42]">{category}</span>
                    <span className="ml-auto text-[15px] text-[#323B42] bg-[#E0F5F1] group-hover:bg-[#007A5E] group-hover:text-white px-4 py-1.5 rounded-full font-medium transition-colors">
                      {categoryItemCount} items
                    </span>
                  </button>

                  {/* Target Customers (Male, Female, Unisex) */}
                  {isCategoryExpanded && (
                    <div className="ml-10 mt-3 space-y-2">
                      {Object.entries(targetCustomers).map(([targetCustomer, conditions]) => {
                        const targetCustomerKey = `${category}-${targetCustomer}`;
                        const isTargetCustomerExpanded = expandedTargetCustomers.has(targetCustomerKey);
                        const targetCustomerItemCount = Object.values(conditions)
                          .flatMap(c => Object.values(c))
                          .flat().length;

                        return (
                          <div key={targetCustomerKey}>
                            {/* Target Customer Header (Male, Female, Unisex) */}
                            <button
                              onClick={() => toggleTargetCustomer(targetCustomerKey)}
                              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFB] rounded-[8px] transition-colors group"
                            >
                              {isTargetCustomerExpanded ? (
                                <ChevronDown className="size-5 text-[#323B42]" />
                              ) : (
                                <ChevronRight className="size-5 text-[#323B42]" />
                              )}
                              {isTargetCustomerExpanded ? (
                                <FolderOpen className="size-6 text-[#008967]" />
                              ) : (
                                <Folder className="size-6 text-[#008967]" />
                              )}
                              <span className="text-[16px] font-semibold text-[#323B42]">{targetCustomer}</span>
                              <span className="ml-auto text-[14px] text-[#323B42] bg-[#F8FAFB] group-hover:bg-white px-3 py-1 rounded-full font-medium">
                                {targetCustomerItemCount} items
                              </span>
                            </button>

                            {/* Conditions (Excellent, Good, Fair, Damaged) */}
                            {isTargetCustomerExpanded && (
                              <div className="ml-10 mt-2 space-y-2">
                                {Object.entries(conditions).map(([condition, subcategories]) => {
                                  const conditionKey = `${targetCustomerKey}-${condition}`;
                                  const isConditionExpanded = expandedConditions.has(conditionKey);
                                  const conditionItemCount = Object.values(subcategories)
                                    .flat().length;

                                  return (
                                    <div key={conditionKey}>
                                      {/* Condition Header */}
                                      <button
                                        onClick={() => toggleCondition(conditionKey)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFB] rounded-[8px] transition-colors group"
                                      >
                                        {isConditionExpanded ? (
                                          <ChevronDown className="size-5 text-[#323B42]" />
                                        ) : (
                                          <ChevronRight className="size-5 text-[#323B42]" />
                                        )}
                                        {isConditionExpanded ? (
                                          <FolderOpen className="size-5 text-[#009BA5]" />
                                        ) : (
                                          <Folder className="size-5 text-[#009BA5]" />
                                        )}
                                        <span className="text-[15px] font-semibold text-[#323B42]">{condition}</span>
                                        <span className="ml-auto text-[13px] text-[#323B42] bg-[#F8FAFB] group-hover:bg-white px-3 py-1 rounded-full font-medium">
                                          {conditionItemCount} items
                                        </span>
                                      </button>

                                      {/* Subcategories */}
                                      {isConditionExpanded && (
                                        <div className="ml-10 mt-2 space-y-2">
                                          {Object.entries(subcategories).map(([subcategory, items]) => {
                                            const subcategoryKey = `${conditionKey}-${subcategory}`;
                                            const isSubcategoryExpanded = expandedSubcategories.has(subcategoryKey);

                                            return (
                                              <div key={subcategoryKey}>
                                                {/* Subcategory Header */}
                                                <button
                                                  onClick={() => toggleSubcategory(subcategoryKey)}
                                                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#F8FAFB] rounded-[8px] transition-colors group"
                                                >
                                                  {isSubcategoryExpanded ? (
                                                    <ChevronDown className="size-4 text-[#323B42]" />
                                                  ) : (
                                                    <ChevronRight className="size-4 text-[#323B42]" />
                                                  )}
                                                  {isSubcategoryExpanded ? (
                                                    <FolderOpen className="size-5 text-[#00A7A5]" />
                                                  ) : (
                                                    <Folder className="size-5 text-[#00A7A5]" />
                                                  )}
                                                  <span className="text-[14px] font-medium text-[#323B42]">{subcategory}</span>
                                                  <span className="ml-auto text-[13px] text-[#323B42] bg-[#F8FAFB] group-hover:bg-white px-2 py-0.5 rounded-full">
                                                    {items.length}
                                                  </span>
                                                </button>

                                                {/* Items */}
                                                {isSubcategoryExpanded && (
                                                  <div className="ml-10 mt-2 space-y-1">
                                                    {items.map((item: InventoryItem) => (
                                                      <div
                                                        key={item.id}
                                                        className="flex items-center gap-4 px-4 py-3 hover:bg-[#F8FAFB] rounded-[8px] transition-colors border border-transparent hover:border-[rgba(0,0,0,0.05)]"
                                                      >
                                                        <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                                                          <div className="col-span-2">
                                                            <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                                                            <p className="text-[12px] text-[#6b7280]">{item.location}</p>
                                                          </div>
                                                          <div className="text-[13px] text-[#323B42]">
                                                            Size: <span className="font-medium">{item.size}</span>
                                                          </div>
                                                          <div>
                                                            <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                                                              item.condition === 'Excellent' ? 'bg-[#E0F5F1] text-[#008967]' :
                                                              item.condition === 'Good' ? 'bg-[#E0F2F2] text-[#007A5E]' :
                                                              item.condition === 'Fair' ? 'bg-[#fef3c6] text-[#92400e]' :
                                                              'bg-[#ffe2e2] text-[#991b1b]'
                                                            }`}>
                                                              {item.condition}
                                                            </span>
                                                          </div>
                                                          <div className="text-[13px]">
                                                            <span className="text-[#6b7280]">Qty: </span>
                                                            <span className="text-[#323B42] font-semibold">{item.quantity}</span>
                                                            <span className="text-[#6b7280] mx-2">â€¢</span>
                                                            <span className="text-[#323B42] font-semibold">â‚±{item.price}</span>
                                                          </div>
                                                          <div className="flex items-center gap-1 justify-end">
                                                            <button
                                                              onClick={() => onEdit(item)}
                                                              className="p-2 hover:bg-[#E0F2F2] rounded-[6px] text-[#007A5E] transition-colors"
                                                              title="Edit"
                                                            >
                                                              <Edit2 className="size-4" />
                                                            </button>
                                                            <button
                                                              onClick={() => onDelete(item.id)}
                                                              className="p-2 hover:bg-[#ffe2e2] rounded-[6px] text-[#991b1b] transition-colors"
                                                              title="Delete"
                                                            >
                                                              <Trash2 className="size-4" />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
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
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {showEditModal && editingId && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 w-[600px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[24px] font-bold text-[#323B42]">Edit Item</h3>
              <button
                onClick={onCancelEdit}
                className="text-[#6b7280] hover:text-[#323B42] transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                  Item Name <span className="text-[#E7000B]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  placeholder="Enter item name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Category <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="e.g., Tops, Bottoms"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Subcategory <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="e.g., T-Shirts, Jeans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                  Target Customer <span className="text-[#E7000B]">*</span>
                </label>
                <select
                  value={formData.targetCustomer}
                  onChange={(e) => setFormData({ ...formData, targetCustomer: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Size <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="e.g., M, L, XL"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Condition <span className="text-[#E7000B]">*</span>
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Quantity <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Price (â‚±) <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                  Location <span className="text-[#E7000B]">*</span>
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                >
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancelEdit}
                className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Items View
function AddItemsView({ formData, setFormData, onSubmit, editingId, onCancel }: any) {
  return (
    <div>
      <h2 className="text-[30px] font-bold text-[#323B42] mb-6">
        {editingId ? 'Edit Item' : 'Add New Item'}
      </h2>

      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-8 max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-[14px] font-medium text-[#323B42] mb-2">Item Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
              placeholder="e.g., Vintage Denim Jacket"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#323B42] mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                required
              >
                <option value="">Select category</option>
                <option value="Tops">Tops</option>
                <option value="Bottoms">Bottoms</option>
                <option value="Dresses">Dresses</option>
                <option value="Outerwear">Outerwear</option>
                <option value="Shoes">Shoes</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#323B42] mb-2">Subcategory</label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                required
                disabled={!formData.category}
              >
                <option value="">Select subcategory</option>
                {formData.category && categorySubcategories[formData.category]?.map((sub: string) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#323B42] mb-2">Target Customer</label>
            <select
              value={formData.targetCustomer}
              onChange={(e) => setFormData({ ...formData, targetCustomer: e.target.value as any })}
              className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
              required
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#323B42] mb-2">Size</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                placeholder="e.g., M, L, XL"
                required
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#323B42] mb-2">Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#323B42] mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                required
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#323B42] mb-2">Price (â‚±)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#323B42] mb-2">Location</label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
              >
                <option value="Main Store">Main Store</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Branch 1">Branch 1</option>
                <option value="Branch 2">Branch 2</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-[#007A5E] text-white px-6 py-3 rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="size-5" />
              {editingId ? 'Update Item' : 'Add Item'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// Reports View
export function ReportsView({
  inventory,
  transfers,
  adjustments,
  purchaseOrders,
  productsReceived,
  locations,
  users,
  currentUser
}: {
  inventory: InventoryItem[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  purchaseOrders: PurchaseOrder[];
  productsReceived: ProductReceived[];
  locations: Location[];
  users: User[];
  currentUser: { email: string; role: string } | null;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'transfers' | 'financial' | 'operations' | 'confidential'>('overview');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '3months' | 'year' | 'all'>('30days');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  const isAdmin = currentUser?.role === 'Admin';

  // Overview Stats
  const overviewStats = useMemo(() => {
    const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const avgPrice = totalItems > 0 ? totalValue / totalItems : 0;
    const totalTransfers = transfers.length;
    const completedTransfers = transfers.filter(t => t.status === 'Completed').length;
    const totalAdjustments = adjustments.length;
    const totalLocations = locations.length;

    return {
      totalValue,
      totalItems,
      avgPrice,
      totalTransfers,
      completedTransfers,
      totalAdjustments,
      totalLocations,
      uniqueItems: inventory.length
    };
  }, [inventory, transfers, adjustments, locations]);

  // Inventory Report Data
  const inventoryReportData = useMemo(() => {
    const categoryStats: { [key: string]: { quantity: number; value: number; items: number } } = {};
    inventory.forEach(item => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { quantity: 0, value: 0, items: 0 };
      }
      categoryStats[item.category].quantity += item.quantity;
      categoryStats[item.category].value += item.price * item.quantity;
      categoryStats[item.category].items += 1;
    });

    const conditionStats = { Excellent: 0, Good: 0, Fair: 0, Damaged: 0 };
    inventory.forEach(item => {
      conditionStats[item.condition] += item.quantity;
    });

    const locationStats: { [key: string]: { quantity: number; value: number; items: number } } = {};
    inventory.forEach(item => {
      if (!locationStats[item.location]) {
        locationStats[item.location] = { quantity: 0, value: 0, items: 0 };
      }
      locationStats[item.location].quantity += item.quantity;
      locationStats[item.location].value += item.price * item.quantity;
      locationStats[item.location].items += 1;
    });

    return { categoryStats, conditionStats, locationStats };
  }, [inventory]);

  // Transfer Report Data
  const transferReportData = useMemo(() => {
    const statusBreakdown = {
      Pending: transfers.filter(t => t.status === 'Pending').length,
      'In Transit': transfers.filter(t => t.status === 'In Transit').length,
      Completed: transfers.filter(t => t.status === 'Completed').length,
      Cancelled: transfers.filter(t => t.status === 'Cancelled').length
    };

    const routeStats: { [key: string]: number } = {};
    transfers.forEach(t => {
      const route = `${t.fromLocation} â†’ ${t.toLocation}`;
      routeStats[route] = (routeStats[route] || 0) + 1;
    });

    const totalItemsTransferred = transfers
      .filter(t => t.status === 'Completed')
      .reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);

    return { statusBreakdown, routeStats, totalItemsTransferred };
  }, [transfers]);

  // Financial Report Data
  const financialReportData = useMemo(() => {
    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const poValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
    const pendingPOValue = purchaseOrders
      .filter(po => po.status === 'Pending' || po.status === 'Approved')
      .reduce((sum, po) => sum + po.totalAmount, 0);

    const categoryValue: { [key: string]: number } = {};
    inventory.forEach(item => {
      categoryValue[item.category] = (categoryValue[item.category] || 0) + (item.price * item.quantity);
    });

    const damagedValue = inventory
      .filter(item => item.condition === 'Damaged')
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return {
      totalInventoryValue,
      poValue,
      pendingPOValue,
      categoryValue,
      damagedValue
    };
  }, [inventory, purchaseOrders]);

  // Operations Report Data
  const operationsReportData = useMemo(() => {
    const adjustmentsByType: { [key: string]: number } = {};
    adjustments.forEach(adj => {
      adjustmentsByType[adj.type] = (adjustmentsByType[adj.type] || 0) + 1;
    });

    const approvedAdjustments = adjustments.filter(a => a.status === 'Approved').length;
    const pendingAdjustments = adjustments.filter(a => a.status === 'Pending').length;

    const receivedItems = productsReceived.reduce((sum, pr) =>
      sum + pr.items.reduce((s, i) => s + i.receivedQty, 0), 0
    );

    const lowStockItems = inventory.filter(item => item.quantity <= 3 && item.condition !== 'Damaged').length;

    return {
      adjustmentsByType,
      approvedAdjustments,
      pendingAdjustments,
      receivedItems,
      lowStockItems,
      totalReceipts: productsReceived.length
    };
  }, [adjustments, productsReceived, inventory]);

  // Confidential Report Data (Admin Only)
  const confidentialReportData = useMemo(() => {
    if (!isAdmin) return null;

    const userActivityLog = users.map(user => ({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin
    }));

    const systemAudit = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'Active').length,
      inactiveUsers: users.filter(u => u.status === 'Inactive').length,
      adminUsers: users.filter(u => u.role === 'Admin').length,
      managerUsers: users.filter(u => u.role === 'Manager').length,
      staffUsers: users.filter(u => u.role === 'Staff').length
    };

    const financialSummary = {
      totalAssetValue: inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      totalPurchaseValue: purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
      damagedLoss: inventory
        .filter(item => item.condition === 'Damaged')
        .reduce((sum, item) => sum + (item.price * item.quantity), 0),
      adjustmentImpact: adjustments
        .filter(a => a.status === 'Approved')
        .reduce((sum, adj) => {
          return sum + adj.items.reduce((s, i) => {
            const item = inventory.find(inv => inv.id === i.itemId);
            return s + (item ? item.price * Math.abs(i.quantityChange) : 0);
          }, 0);
        }, 0)
    };

    const criticalEvents = [
      ...adjustments
        .filter(a => a.type === 'Lost' || a.type === 'Damage')
        .map(a => ({
          type: 'Adjustment',
          description: `${a.type}: ${a.reason}`,
          date: a.date,
          createdBy: a.createdBy,
          status: a.status
        })),
      ...transfers
        .filter(t => t.status === 'Cancelled')
        .map(t => ({
          type: 'Transfer',
          description: `Cancelled Transfer: ${t.transferNumber}`,
          date: t.date,
          createdBy: t.createdBy,
          status: t.status
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      userActivityLog,
      systemAudit,
      financialSummary,
      criticalEvents
    };
  }, [isAdmin, users, inventory, purchaseOrders, adjustments, transfers]);

  const handleExportReport = (reportType: string) => {
    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = `${reportType}_Report_${timestamp}.csv`;

    switch (reportType) {
      case 'Overview':
        csvContent = 'Metric,Value\n';
        csvContent += `Total Inventory Value,â‚±${overviewStats.totalValue.toLocaleString()}\n`;
        csvContent += `Total Items,${overviewStats.totalItems}\n`;
        csvContent += `Average Price,â‚±${overviewStats.avgPrice.toFixed(2)}\n`;
        csvContent += `Total Transfers,${overviewStats.totalTransfers}\n`;
        csvContent += `Completed Transfers,${overviewStats.completedTransfers}\n`;
        csvContent += `Total Adjustments,${overviewStats.totalAdjustments}\n`;
        csvContent += `Total Locations,${overviewStats.totalLocations}\n`;
        csvContent += `Unique Items,${overviewStats.uniqueItems}\n`;
        break;

      case 'Inventory':
        csvContent = 'Category,Quantity,Value,Items\n';
        Object.entries(inventoryReportData.categoryStats).forEach(([category, stats]) => {
          csvContent += `${category},${stats.quantity},â‚±${stats.value.toLocaleString()},${stats.items}\n`;
        });
        csvContent += '\nCondition,Quantity\n';
        Object.entries(inventoryReportData.conditionStats).forEach(([condition, quantity]) => {
          csvContent += `${condition},${quantity}\n`;
        });
        csvContent += '\nLocation,Quantity,Value,Items\n';
        Object.entries(inventoryReportData.locationStats).forEach(([location, stats]) => {
          csvContent += `${location},${stats.quantity},â‚±${stats.value.toLocaleString()},${stats.items}\n`;
        });
        break;

      case 'Transfers':
        csvContent = 'Status,Count\n';
        Object.entries(transferReportData.statusBreakdown).forEach(([status, count]) => {
          csvContent += `${status},${count}\n`;
        });
        csvContent += '\nRoute,Transfers\n';
        Object.entries(transferReportData.routeStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .forEach(([route, count]) => {
            csvContent += `${route},${count}\n`;
          });
        csvContent += `\nTotal Items Transferred,${transferReportData.totalItemsTransferred}\n`;
        break;

      case 'Financial':
        csvContent = 'Metric,Value\n';
        csvContent += `Total Inventory Value,â‚±${financialReportData.totalInventoryValue.toLocaleString()}\n`;
        csvContent += `Total PO Investment,â‚±${financialReportData.poValue.toLocaleString()}\n`;
        csvContent += `Pending PO Value,â‚±${financialReportData.pendingPOValue.toLocaleString()}\n`;
        csvContent += `Loss from Damage,â‚±${financialReportData.damagedValue.toLocaleString()}\n`;
        csvContent += '\nCategory,Value\n';
        Object.entries(financialReportData.categoryValue).forEach(([category, value]) => {
          csvContent += `${category},â‚±${value.toLocaleString()}\n`;
        });
        break;

      case 'Operations':
        csvContent = 'Metric,Value\n';
        csvContent += `Total Receipts,${operationsReportData.totalReceipts}\n`;
        csvContent += `Items Received,${operationsReportData.receivedItems}\n`;
        csvContent += `Approved Adjustments,${operationsReportData.approvedAdjustments}\n`;
        csvContent += `Pending Adjustments,${operationsReportData.pendingAdjustments}\n`;
        csvContent += `Low Stock Items,${operationsReportData.lowStockItems}\n`;
        csvContent += '\nAdjustment Type,Count\n';
        Object.entries(operationsReportData.adjustmentsByType).forEach(([type, count]) => {
          csvContent += `${type},${count}\n`;
        });
        break;

      case 'Confidential':
        if (!isAdmin || !confidentialReportData) {
          alert('Access denied. This report is restricted to administrators only.');
          return;
        }
        csvContent = 'CONFIDENTIAL REPORT - ADMIN ONLY\n\n';
        csvContent += 'System Audit Summary\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Total Users,${confidentialReportData.systemAudit.totalUsers}\n`;
        csvContent += `Active Users,${confidentialReportData.systemAudit.activeUsers}\n`;
        csvContent += `Inactive Users,${confidentialReportData.systemAudit.inactiveUsers}\n`;
        csvContent += `Admin Users,${confidentialReportData.systemAudit.adminUsers}\n`;
        csvContent += `Manager Users,${confidentialReportData.systemAudit.managerUsers}\n`;
        csvContent += `Staff Users,${confidentialReportData.systemAudit.staffUsers}\n`;
        csvContent += '\nFinancial Summary\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Total Asset Value,â‚±${confidentialReportData.financialSummary.totalAssetValue.toLocaleString()}\n`;
        csvContent += `Total Purchase Value,â‚±${confidentialReportData.financialSummary.totalPurchaseValue.toLocaleString()}\n`;
        csvContent += `Damaged Loss,â‚±${confidentialReportData.financialSummary.damagedLoss.toLocaleString()}\n`;
        csvContent += `Adjustment Impact,â‚±${confidentialReportData.financialSummary.adjustmentImpact.toLocaleString()}\n`;
        csvContent += '\nUser Activity Log\n';
        csvContent += 'Name,Email,Role,Status,Last Login\n';
        confidentialReportData.userActivityLog.forEach(user => {
          csvContent += `${user.name},${user.email},${user.role},${user.status},${user.lastLogin}\n`;
        });
        csvContent += '\nCritical Events\n';
        csvContent += 'Type,Description,Date,Created By,Status\n';
        confidentialReportData.criticalEvents.slice(0, 20).forEach(event => {
          csvContent += `${event.type},"${event.description}",${event.date},${event.createdBy},${event.status}\n`;
        });
        break;

      default:
        alert('Unknown report type');
        return;
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">Reports & Analytics</h2>
          <p className="text-[14px] text-[#6b7280] mt-1">Comprehensive system reports and insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] px-4 py-2 text-[14px] text-[#323B42]"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[8px] px-4 py-2 text-[14px] text-[#323B42]"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.name}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[rgba(0,0,0,0.1)]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'text-[#007A5E] border-[#007A5E]'
              : 'text-[#6b7280] border-transparent hover:text-[#323B42]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${
            activeTab === 'inventory'
              ? 'text-[#007A5E] border-[#007A5E]'
              : 'text-[#6b7280] border-transparent hover:text-[#323B42]'
          }`}
        >
          Inventory Report
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${
            activeTab === 'transfers'
              ? 'text-[#007A5E] border-[#007A5E]'
              : 'text-[#6b7280] border-transparent hover:text-[#323B42]'
          }`}
        >
          Transfer Report
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${
              activeTab === 'financial'
                ? 'text-[#007A5E] border-[#007A5E]'
                : 'text-[#6b7280] border-transparent hover:text-[#323B42]'
            }`}
          >
            Financial Report
          </button>
        )}
        <button
          onClick={() => setActiveTab('operations')}
          className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors ${
            activeTab === 'operations'
              ? 'text-[#007A5E] border-[#007A5E]'
              : 'text-[#6b7280] border-transparent hover:text-[#323B42]'
          }`}
        >
          Operations Report
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('confidential')}
            className={`px-6 py-3 text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'confidential'
                ? 'text-[#E7000B] border-[#E7000B]'
                : 'text-[#6b7280] border-transparent hover:text-[#323B42]'
            }`}
          >
            <Eye className="size-4" />
            Confidential
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[20px] font-semibold text-[#323B42]">System Overview</h3>
            <button
              onClick={() => handleExportReport('Overview')}
              className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
            >
              Export Report
            </button>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Total Inventory Value</p>
              <p className="text-[#323B42] text-[24px] font-bold">â‚±{overviewStats.totalValue.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Total Items</p>
              <p className="text-[#323B42] text-[24px] font-bold">{overviewStats.totalItems.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Unique Items</p>
              <p className="text-[#323B42] text-[24px] font-bold">{overviewStats.uniqueItems}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Active Locations</p>
              <p className="text-[#323B42] text-[24px] font-bold">{overviewStats.totalLocations}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Total Transfers</p>
              <p className="text-[#323B42] text-[24px] font-bold">{overviewStats.totalTransfers}</p>
              <p className="text-[#00a63e] text-[12px] mt-1">{overviewStats.completedTransfers} completed</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Total Adjustments</p>
              <p className="text-[#323B42] text-[24px] font-bold">{overviewStats.totalAdjustments}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Average Item Price</p>
              <p className="text-[#323B42] text-[24px] font-bold">â‚±{Math.round(overviewStats.avgPrice)}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Inventory by Category</h4>
              {Object.keys(inventoryReportData.categoryStats).length > 0 ? (
                <div className="flex items-center gap-4">
                  <PieChart width={200} height={200}>
                    <Pie
                      data={Object.entries(inventoryReportData.categoryStats).map(([name, data]) => ({ name, value: data.quantity }))}
                      cx={100}
                      cy={100}
                      labelLine={false}
                      label={false}
                      outerRadius={80}
                      dataKey="value"
                      key="inventory-category-pie"
                    >
                      {Object.keys(inventoryReportData.categoryStats).map((cat, index) => (
                        <Cell key={`inventory-category-cell-${cat}-${index}`} fill={['#007A5E', '#155DFC', '#FFA500', '#E7000B', '#8B5CF6', '#EC4899', '#10b981'][index % 7]} />
                      ))}
                    </Pie>
                    <Tooltip key="inventory-category-tooltip" />
                  </PieChart>
                  <div className="flex-1 space-y-2">
                    {Object.entries(inventoryReportData.categoryStats).map(([name, data], index) => {
                      const total = Object.values(inventoryReportData.categoryStats).reduce((sum: number, cat: any) => sum + cat.quantity, 0);
                      const percentage = total > 0 ? ((data.quantity / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={`legend-${name}-${index}`} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3 rounded-full"
                              style={{ backgroundColor: ['#007A5E', '#155DFC', '#FFA500', '#E7000B', '#8B5CF6', '#EC4899', '#10b981'][index % 7] }}
                            />
                            <span className="text-[13px] text-[#323B42]">{name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[#6b7280]">{data.quantity}</span>
                            <span className="text-[13px] font-semibold text-[#323B42]">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-[#6b7280]">No data available</div>
              )}
            </div>

            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Items by Condition</h4>
              <BarChart width={400} height={250} data={Object.entries(inventoryReportData.conditionStats).map(([name, value]) => ({ condition: name, count: value }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" key="inventory-condition-grid" />
                <XAxis dataKey="condition" stroke="#6b7280" style={{ fontSize: '12px' }} key="inventory-condition-xaxis" />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} key="inventory-condition-yaxis" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} key="inventory-condition-tooltip" />
                <Bar dataKey="count" fill="#007A5E" radius={[8, 8, 0, 0]} key="inventory-condition-bar" />
              </BarChart>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[20px] font-semibold text-[#323B42]">Detailed Inventory Report</h3>
            <button
              onClick={() => handleExportReport('Inventory')}
              className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
            >
              Export Report
            </button>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Inventory by Category</h4>
            <div className="space-y-3">
              {Object.entries(inventoryReportData.categoryStats)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([category, data]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-[#323B42]">{category}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-[12px] text-[#6b7280]">{data.quantity} items</span>
                        <span className="text-[12px] text-[#6b7280]">â€¢</span>
                        <span className="text-[12px] text-[#6b7280]">{data.items} unique products</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-[#007A5E]">â‚±{data.value.toLocaleString()}</p>
                      <p className="text-[12px] text-[#6b7280]">
                        {overviewStats.totalValue > 0 ? ((data.value / overviewStats.totalValue) * 100).toFixed(1) : '0'}% of total
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Location Breakdown */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Inventory by Location</h4>
            <div className="space-y-3">
              {Object.entries(inventoryReportData.locationStats)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([location, data]) => (
                  <div key={location} className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-[#323B42]">{location}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-[12px] text-[#6b7280]">{data.quantity} items</span>
                        <span className="text-[12px] text-[#6b7280]">â€¢</span>
                        <span className="text-[12px] text-[#6b7280]">{data.items} unique products</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-[#008967]">â‚±{data.value.toLocaleString()}</p>
                      <p className="text-[12px] text-[#6b7280]">
                        {overviewStats.totalValue > 0 ? ((data.value / overviewStats.totalValue) * 100).toFixed(1) : '0'}% of total
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Condition Analysis */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Stock Condition Analysis</h4>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(inventoryReportData.conditionStats).map(([condition, count]) => (
                <div key={condition} className="p-4 bg-[#F8FAFB] rounded-[8px]">
                  <p className="text-[12px] text-[#6b7280] mb-1">{condition}</p>
                  <p className="text-[20px] font-bold text-[#323B42]">{count}</p>
                  <p className="text-[12px] text-[#6b7280] mt-1">
                    {overviewStats.totalItems > 0 ? ((count / overviewStats.totalItems) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transfers' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[20px] font-semibold text-[#323B42]">Transfer Activity Report</h3>
            <button
              onClick={() => handleExportReport('Transfers')}
              className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
            >
              Export Report
            </button>
          </div>

          {/* Transfer Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {Object.entries(transferReportData.statusBreakdown).map(([status, count]) => (
              <div key={status} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                <p className="text-[#6b7280] text-[12px] mb-2">{status}</p>
                <p className="text-[#323B42] text-[24px] font-bold">{count}</p>
                <p className="text-[#6b7280] text-[12px] mt-1">
                  {overviewStats.totalTransfers > 0 ? ((count / overviewStats.totalTransfers) * 100).toFixed(0) : '0'}%
                </p>
              </div>
            ))}
          </div>

          {/* Route Analysis */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Transfer Routes Analysis</h4>
            <div className="space-y-3">
              {Object.entries(transferReportData.routeStats)
                .sort((a, b) => b[1] - a[1])
                .map(([route, count]) => (
                  <div key={route} className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                    <p className="text-[14px] font-medium text-[#323B42]">{route}</p>
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-[#007A5E]">{count} transfers</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Transfer Summary */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Transfer Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[#E0F5F1] rounded-[8px]">
                <p className="text-[12px] text-[#007A5E] mb-1">Total Items Transferred</p>
                <p className="text-[24px] font-bold text-[#007A5E]">{transferReportData.totalItemsTransferred}</p>
              </div>
              <div className="p-4 bg-[#E0F2F2] rounded-[8px]">
                <p className="text-[12px] text-[#008967] mb-1">Completion Rate</p>
                <p className="text-[24px] font-bold text-[#008967]">
                  {overviewStats.totalTransfers > 0
                    ? ((overviewStats.completedTransfers / overviewStats.totalTransfers) * 100).toFixed(0)
                    : 0}%
                </p>
              </div>
              <div className="p-4 bg-[#fff4e6] rounded-[8px]">
                <p className="text-[12px] text-[#FFA500] mb-1">Active Routes</p>
                <p className="text-[24px] font-bold text-[#FFA500]">{Object.keys(transferReportData.routeStats).length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financial' && !isAdmin && (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
          <div className="bg-[#ffe2e2] size-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="size-10 text-[#E7000B]" />
          </div>
          <h3 className="text-[20px] font-bold text-[#323B42] mb-2">Access Denied</h3>
          <p className="text-[14px] text-[#6b7280]">
            You do not have permission to view financial reports.<br />
            This section is restricted to administrators only.
          </p>
        </div>
      )}

      {activeTab === 'financial' && isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[20px] font-semibold text-[#323B42]">Financial Report</h3>
            <button
              onClick={() => handleExportReport('Financial')}
              className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
            >
              Export Report
            </button>
          </div>

          {/* Financial Overview */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Total Asset Value</p>
              <p className="text-[#323B42] text-[24px] font-bold">â‚±{financialReportData.totalInventoryValue.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Purchase Orders Value</p>
              <p className="text-[#323B42] text-[24px] font-bold">â‚±{financialReportData.poValue.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Pending PO Value</p>
              <p className="text-[#FFA500] text-[24px] font-bold">â‚±{financialReportData.pendingPOValue.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Damaged Stock Value</p>
              <p className="text-[#E7000B] text-[24px] font-bold">â‚±{financialReportData.damagedValue.toLocaleString()}</p>
            </div>
          </div>

          {/* Value by Category */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Value by Category</h4>
            <div className="space-y-3">
              {Object.entries(financialReportData.categoryValue)
                .sort((a, b) => b[1] - a[1])
                .map(([category, value]) => (
                  <div key={category}>
                    <div className="flex justify-between text-[14px] mb-1">
                      <span className="text-[#323B42] font-medium">{category}</span>
                      <span className="text-[#007A5E] font-bold">â‚±{value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-[#F8FAFB] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#007A5E] rounded-full"
                        style={{ width: `${financialReportData.totalInventoryValue > 0 ? (value / financialReportData.totalInventoryValue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Financial Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Value Distribution</h4>
              {Object.keys(financialReportData.categoryValue).length > 0 ? (
                <PieChart width={400} height={250}>
                  <Pie
                    data={Object.entries(financialReportData.categoryValue).map(([name, value]) => ({ name, value }))}
                    cx={200}
                    cy={125}
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${!isNaN(percent) ? (percent * 100).toFixed(0) : '0'}%`}
                    outerRadius={80}
                    dataKey="value"
                    key="financial-category-pie"
                  >
                    {Object.keys(financialReportData.categoryValue).map((cat, index) => (
                      <Cell key={`financial-category-cell-${cat}-${index}`} fill={['#007A5E', '#155DFC', '#FFA500', '#E7000B', '#8B5CF6', '#EC4899', '#10b981'][index % 7]} />
                    ))}
                  </Pie>
                  <Tooltip key="financial-category-tooltip" />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-[#6b7280]">No data available</div>
              )}
            </div>

            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Financial Health Indicators</h4>
              <div className="space-y-4">
                <div className="p-4 bg-[#E0F5F1] rounded-[8px]">
                  <p className="text-[12px] text-[#007A5E] mb-1">Asset Health Score</p>
                  <p className="text-[24px] font-bold text-[#007A5E]">
                    {financialReportData.totalInventoryValue > 0
                      ? (((financialReportData.totalInventoryValue - financialReportData.damagedValue) / financialReportData.totalInventoryValue) * 100).toFixed(1)
                      : '0'}%
                  </p>
                </div>
                <div className="p-4 bg-[#E0F2F2] rounded-[8px]">
                  <p className="text-[12px] text-[#008967] mb-1">Investment Return Potential</p>
                  <p className="text-[24px] font-bold text-[#008967]">
                    {financialReportData.poValue > 0
                      ? ((financialReportData.totalInventoryValue / financialReportData.poValue) * 100).toFixed(0)
                      : 0}%
                  </p>
                </div>
                <div className="p-4 bg-[#ffe2e2] rounded-[8px]">
                  <p className="text-[12px] text-[#E7000B] mb-1">Loss from Damage</p>
                  <p className="text-[24px] font-bold text-[#E7000B]">
                    â‚±{financialReportData.damagedValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'operations' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[20px] font-semibold text-[#323B42]">Operations Report</h3>
            <button
              onClick={() => handleExportReport('Operations')}
              className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
            >
              Export Report
            </button>
          </div>

          {/* Operations Overview */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Total Receipts</p>
              <p className="text-[#323B42] text-[24px] font-bold">{operationsReportData.totalReceipts}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Items Received</p>
              <p className="text-[#323B42] text-[24px] font-bold">{operationsReportData.receivedItems}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Approved Adjustments</p>
              <p className="text-[#00a63e] text-[24px] font-bold">{operationsReportData.approvedAdjustments}</p>
            </div>
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <p className="text-[#6b7280] text-[12px] mb-2">Low Stock Alerts</p>
              <p className="text-[#E7000B] text-[24px] font-bold">{operationsReportData.lowStockItems}</p>
            </div>
          </div>

          {/* Adjustment Analysis */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Adjustments by Type</h4>
            <div className="space-y-3">
              {Object.entries(operationsReportData.adjustmentsByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                    <div>
                      <p className="text-[14px] font-medium text-[#323B42]">{type}</p>
                      <p className="text-[12px] text-[#6b7280]">
                        {overviewStats.totalAdjustments > 0
                          ? ((count / overviewStats.totalAdjustments) * 100).toFixed(0)
                          : 0}% of total
                      </p>
                    </div>
                    <p className="text-[18px] font-bold text-[#007A5E]">{count}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Adjustment Status</h4>
              <BarChart
                width={400}
                height={250}
                data={[
                  { status: 'Approved', count: operationsReportData.approvedAdjustments },
                  { status: 'Pending', count: operationsReportData.pendingAdjustments },
                  { status: 'Total', count: overviewStats.totalAdjustments }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" key="adjustment-status-grid" />
                <XAxis dataKey="status" stroke="#6b7280" style={{ fontSize: '12px' }} key="adjustment-status-xaxis" />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} key="adjustment-status-yaxis" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} key="adjustment-status-tooltip" />
                <Bar dataKey="count" fill="#007A5E" radius={[8, 8, 0, 0]} key="adjustment-status-bar" />
              </BarChart>
            </div>

            <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
              <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Stock Health</h4>
              <div className="space-y-4 mt-6">
                <div className="p-4 bg-[#E0F5F1] rounded-[8px]">
                  <p className="text-[12px] text-[#007A5E] mb-1">Healthy Stock Items</p>
                  <p className="text-[24px] font-bold text-[#007A5E]">
                    {overviewStats.totalItems - operationsReportData.lowStockItems}
                  </p>
                </div>
                <div className="p-4 bg-[#ffe2e2] rounded-[8px]">
                  <p className="text-[12px] text-[#E7000B] mb-1">Low Stock Items</p>
                  <p className="text-[24px] font-bold text-[#E7000B]">{operationsReportData.lowStockItems}</p>
                </div>
                <div className="p-4 bg-[#fff4e6] rounded-[8px]">
                  <p className="text-[12px] text-[#FFA500] mb-1">Pending Adjustments</p>
                  <p className="text-[24px] font-bold text-[#FFA500]">{operationsReportData.pendingAdjustments}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'confidential' && isAdmin && confidentialReportData && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-[#E7000B] text-white px-3 py-1 rounded-[6px] text-[12px] font-bold flex items-center gap-2">
              <Eye className="size-4" />
              CONFIDENTIAL - ADMIN ONLY
            </div>
            <div className="flex-1" />
            <button
              onClick={() => handleExportReport('Confidential')}
              className="bg-[#E7000B] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#c40009] transition-colors"
            >
              Export Confidential Report
            </button>
          </div>

          <div className="bg-[#ffe2e2] border-2 border-[#E7000B] rounded-[14px] p-4 mb-6">
            <p className="text-[14px] text-[#E7000B] font-semibold">âš ï¸ Warning</p>
            <p className="text-[12px] text-[#323B42] mt-1">
              This report contains sensitive financial and operational data. Access is restricted to administrators only.
              Do not share this information with unauthorized personnel.
            </p>
          </div>

          {/* System Audit */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">System Audit Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[#F8FAFB] rounded-[8px]">
                <p className="text-[12px] text-[#6b7280] mb-1">Total Users</p>
                <p className="text-[24px] font-bold text-[#323B42]">{confidentialReportData.systemAudit.totalUsers}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[11px] text-[#00a63e]">
                    Active: {confidentialReportData.systemAudit.activeUsers}
                  </span>
                  <span className="text-[11px] text-[#E7000B]">
                    Inactive: {confidentialReportData.systemAudit.inactiveUsers}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-[#E0F5F1] rounded-[8px]">
                <p className="text-[12px] text-[#007A5E] mb-1">Admin Users</p>
                <p className="text-[24px] font-bold text-[#007A5E]">{confidentialReportData.systemAudit.adminUsers}</p>
              </div>
              <div className="p-4 bg-[#E0F2F2] rounded-[8px]">
                <p className="text-[12px] text-[#008967] mb-1">Staff Users</p>
                <p className="text-[24px] font-bold text-[#008967]">
                  {confidentialReportData.systemAudit.staffUsers + confidentialReportData.systemAudit.managerUsers}
                </p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Confidential Financial Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#E0F5F1] rounded-[8px]">
                <p className="text-[12px] text-[#007A5E] mb-1">Total Asset Value</p>
                <p className="text-[28px] font-bold text-[#007A5E]">
                  â‚±{confidentialReportData.financialSummary.totalAssetValue.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#6b7280] mt-1">Current inventory valuation</p>
              </div>
              <div className="p-4 bg-[#fff4e6] rounded-[8px]">
                <p className="text-[12px] text-[#FFA500] mb-1">Total Purchase Investment</p>
                <p className="text-[28px] font-bold text-[#FFA500]">
                  â‚±{confidentialReportData.financialSummary.totalPurchaseValue.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#6b7280] mt-1">All purchase orders</p>
              </div>
              <div className="p-4 bg-[#ffe2e2] rounded-[8px]">
                <p className="text-[12px] text-[#E7000B] mb-1">Loss from Damaged Stock</p>
                <p className="text-[28px] font-bold text-[#E7000B]">
                  â‚±{confidentialReportData.financialSummary.damagedLoss.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#6b7280] mt-1">Non-recoverable items</p>
              </div>
              <div className="p-4 bg-[#E0F2F2] rounded-[8px]">
                <p className="text-[12px] text-[#008967] mb-1">Adjustment Impact Value</p>
                <p className="text-[28px] font-bold text-[#008967]">
                  â‚±{confidentialReportData.financialSummary.adjustmentImpact.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#6b7280] mt-1">Approved adjustments</p>
              </div>
            </div>
          </div>

          {/* User Activity Log */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">User Activity Log</h4>
            <div className="space-y-2">
              {confidentialReportData.userActivityLog.map(user => (
                <div key={user.email} className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                  <div className="flex items-center gap-4">
                    <div className={`size-8 rounded-full flex items-center justify-center text-white text-[14px] font-bold ${
                      user.role === 'Admin' ? 'bg-[#E7000B]' :
                      user.role === 'Manager' ? 'bg-[#007A5E]' :
                      'bg-[#008967]'
                    }`}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#323B42]">{user.name}</p>
                      <p className="text-[12px] text-[#6b7280]">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-[6px] text-[12px] font-medium ${
                      user.role === 'Admin' ? 'bg-[#ffe2e2] text-[#E7000B]' :
                      user.role === 'Manager' ? 'bg-[#E0F5F1] text-[#007A5E]' :
                      'bg-[#E0F2F2] text-[#008967]'
                    }`}>
                      {user.role}
                    </span>
                    <span className={`px-3 py-1 rounded-[6px] text-[12px] font-medium ${
                      user.status === 'Active' ? 'bg-[#E0F5F1] text-[#00a63e]' : 'bg-[#F8FAFB] text-[#6b7280]'
                    }`}>
                      {user.status}
                    </span>
                    <p className="text-[12px] text-[#6b7280] w-32 text-right">{user.lastLogin}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Events */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Critical Events & Incidents</h4>
            <div className="space-y-2">
              {confidentialReportData.criticalEvents.length === 0 ? (
                <p className="text-[14px] text-[#6b7280] text-center py-4">No critical events recorded</p>
              ) : (
                confidentialReportData.criticalEvents.slice(0, 10).map((event, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-[#ffe2e2] rounded-[8px] border border-[#E7000B]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-[#E7000B] text-white px-2 py-1 rounded text-[11px] font-bold">
                          {event.type}
                        </span>
                        <p className="text-[14px] font-medium text-[#323B42]">{event.description}</p>
                      </div>
                      <p className="text-[12px] text-[#6b7280]">Created by: {event.createdBy}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] text-[#323B42]">{event.date}</p>
                      <span className={`text-[11px] font-medium ${
                        event.status === 'Approved' ? 'text-[#00a63e]' :
                        event.status === 'Pending' ? 'text-[#FFA500]' :
                        'text-[#E7000B]'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Purchase Orders History */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6 mb-4">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Purchase Orders History</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8F9FA]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">PO ID</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Created By</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Total Amount</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <p className="text-[14px] text-[#6b7280]">No purchase orders found</p>
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map(po => (
                      <tr key={po.id} className="hover:bg-[#F8F9FA] transition-colors">
                        <td className="px-4 py-3 text-[13px] text-[#323B42] font-medium">{po.id}</td>
                        <td className="px-4 py-3 text-[13px] text-[#323B42]">{po.supplier}</td>
                        <td className="px-4 py-3 text-[13px] text-[#6b7280]">{po.createdBy || 'Admin User'}</td>
                        <td className="px-4 py-3 text-[13px] text-[#6b7280]">{po.date}</td>
                        <td className="px-4 py-3 text-[13px] text-[#323B42] font-medium">â‚±{po.totalAmount.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-[11px] font-medium rounded-full ${
                            po.status === 'Approved' ? 'bg-[#d1f4e8] text-[#00a63e]' :
                            po.status === 'Pending' ? 'bg-[#fff3cd] text-[#856404]' :
                            po.status === 'Rejected' ? 'bg-[#ffe2e2] text-[#E7000B]' :
                            'bg-[#e2e8f0] text-[#475569]'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#6b7280]">{po.items.length} items</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Products Received History */}
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
            <h4 className="text-[16px] font-semibold text-[#323B42] mb-4">Products Received History</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8F9FA]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Receipt ID</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">PO ID</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Received Date</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Received By</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Total Items</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Accepted</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Rejected</th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#323B42] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(0,0,0,0.1)]">
                  {productsReceived.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center">
                        <p className="text-[14px] text-[#6b7280]">No products received found</p>
                      </td>
                    </tr>
                  ) : (
                    productsReceived.map(pr => (
                      <tr key={pr.id} className="hover:bg-[#F8F9FA] transition-colors">
                        <td className="px-4 py-3 text-[13px] text-[#323B42] font-medium">{pr.id}</td>
                        <td className="px-4 py-3 text-[13px] text-[#007A5E] font-medium">{pr.poId}</td>
                        <td className="px-4 py-3 text-[13px] text-[#6b7280]">{pr.receivedDate}</td>
                        <td className="px-4 py-3 text-[13px] text-[#323B42]">{pr.receivedBy}</td>
                        <td className="px-4 py-3 text-[13px] text-[#6b7280]">
                          {pr.items.reduce((sum, item) => sum + item.receivedQty, 0)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#00a63e] font-medium">
                          {pr.items.reduce((sum, item) => sum + (item.acceptedQty || item.receivedQty), 0)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#E7000B] font-medium">
                          {pr.items.reduce((sum, item) => sum + (item.rejectedQty || 0), 0)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-[11px] font-medium rounded-full ${
                            pr.status === 'Completed' ? 'bg-[#d1f4e8] text-[#00a63e]' :
                            'bg-[#fff3cd] text-[#856404]'
                          }`}>
                            {pr.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'confidential' && !isAdmin && (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
          <div className="bg-[#ffe2e2] size-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="size-10 text-[#E7000B]" />
          </div>
          <h3 className="text-[20px] font-bold text-[#323B42] mb-2">Access Denied</h3>
          <p className="text-[14px] text-[#6b7280]">
            You do not have permission to view confidential reports.<br />
            This section is restricted to administrators only.
          </p>
        </div>
      )}
    </div>
  );
}

// Purchase Orders View
export function ProductsReceivedView({
  currentUser
}: {
  currentUser: { email: string; role: string } | null;
}) {
  const [approvedPOs, setApprovedPOs] = useState<any[]>([]);
  const [receivedPOs, setReceivedPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [inspectionForm, setInspectionForm] = useState<{
    [itemId: string]: {
      receivedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      condition: 'Excellent' | 'Good' | 'Fair' | 'Damaged';
      inspectionNotes: string;
    };
  }>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [approved, received] = await Promise.all([
        getPurchaseOrders({ status: 'APPROVED' }),
        getPurchaseOrders({ status: 'RECEIVED' }),
      ]);
      setApprovedPOs(approved);
      setReceivedPOs(received);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const poTotalAccepted = (po: any) =>
    (po.items ?? []).reduce((sum: number, item: any) => sum + (item.receivedQty - item.rejectedQty), 0);

  const poTotalRejected = (po: any) =>
    (po.items ?? []).reduce((sum: number, item: any) => sum + item.rejectedQty, 0);

  const poStatus = (po: any) =>
    poTotalRejected(po) === 0 ? 'Fully Accepted' : 'Partially Accepted';

  const filteredReceipts = receivedPOs.filter(po => {
    if (filterStatus === 'all') return true;
    return poStatus(po) === filterStatus;
  });

  const stats = {
    total: receivedPOs.length,
    readyToReceive: approvedPOs.length,
    fullyAccepted: receivedPOs.filter(po => poTotalRejected(po) === 0).length,
    withRejections: receivedPOs.filter(po => poTotalRejected(po) > 0).length,
  };

  const handleStartReceiving = async (po: any) => {
    try {
      setError(null);
      const fullPO = await getPurchaseOrder(po.id);
      setSelectedPO(fullPO);
      const initialForm: typeof inspectionForm = {};
      (fullPO.items ?? []).forEach((item: any) => {
        initialForm[item.id] = {
          receivedQty: item.quantity,
          acceptedQty: item.quantity,
          rejectedQty: 0,
          condition: 'Good',
          inspectionNotes: '',
        };
      });
      setInspectionForm(initialForm);
      setShowReceiveModal(false);
      setShowInspectionModal(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleInspectionChange = (itemId: string, field: string, value: any) => {
    setInspectionForm(prev => {
      const entry = { ...prev[itemId], [field]: value };
      if (field === 'receivedQty' || field === 'acceptedQty') {
        const rq = field === 'receivedQty' ? value : entry.receivedQty;
        const aq = field === 'acceptedQty' ? value : entry.acceptedQty;
        entry.rejectedQty = Math.max(0, rq - aq);
      }
      return { ...prev, [itemId]: entry };
    });
  };

  const handleCompleteInspection = async () => {
    if (!selectedPO || saving) return;
    try {
      setSaving(true);
      setError(null);
      const items = (selectedPO.items ?? []).map((item: any) => {
        const ins = inspectionForm[item.id] ?? { receivedQty: item.quantity, rejectedQty: 0 };
        return { id: item.id, receivedQty: ins.receivedQty, rejectedQty: ins.rejectedQty };
      });
      await receivePurchaseOrder(selectedPO.id, items);
      setShowInspectionModal(false);
      setSelectedPO(null);
      setInspectionForm({});
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">Products Received</h2>
          <p className="text-[#323B42] text-[14px] mt-1">Inspect and log received inventory shipments</p>
        </div>
        <button
          onClick={() => setShowReceiveModal(true)}
          disabled={loading}
          className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#008967] transition-colors disabled:opacity-50"
        >
          <PackageCheck className="size-4" />
          Receive Purchase Order
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[#ffe2e2] border border-[#E7000B] rounded-[8px] text-[14px] text-[#E7000B]">
          {error}
        </div>
      )}

      {/* Select PO Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[24px] font-bold text-[#323B42]">Select Purchase Order to Receive</h3>
              <button onClick={() => setShowReceiveModal(false)} className="p-2 hover:bg-[#F8FAFB] rounded">
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            {approvedPOs.length === 0 ? (
              <p className="text-center py-8 text-[#323B42]">No approved purchase orders available</p>
            ) : (
              <div className="space-y-3">
                {approvedPOs.map(po => (
                  <div key={po.id} className="border border-[rgba(0,0,0,0.1)] rounded-[12px] p-4 hover:bg-[#F8FAFB] transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-[16px] font-semibold text-[#323B42]">{po.orderNumber}</h4>
                          <span className="px-2 py-1 rounded text-[11px] font-semibold bg-[#E0F2F2] text-[#007A5E]">
                            APPROVED
                          </span>
                        </div>
                        <p className="text-[13px] text-[#323B42]">Supplier: {po.supplier?.name ?? 'N/A'}</p>
                        <p className="text-[13px] text-[#323B42]">Date: {new Date(po.createdAt).toLocaleDateString()}</p>
                        <p className="text-[13px] text-[#323B42]">Items: {(po.items ?? []).length} | Total: ₱{(po.totalAmount ?? 0).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => handleStartReceiving(po)}
                        className="px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#008967] transition-colors"
                      >
                        Start Receiving
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {showInspectionModal && selectedPO && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[24px] font-bold text-[#323B42]">Quality Inspection - {selectedPO.orderNumber}</h3>
                <p className="text-[14px] text-[#323B42] mt-1">Supplier: {selectedPO.supplier?.name ?? 'N/A'}</p>
              </div>
              <button onClick={() => setShowInspectionModal(false)} className="p-2 hover:bg-[#F8FAFB] rounded">
                <X className="size-5 text-[#323B42]" />
              </button>
            </div>

            <div className="mb-6 bg-[#E0F5F1] border border-[#007A5E] rounded-[12px] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="size-5 text-[#007A5E] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-[#007A5E] mb-1">Auto-Sorting Enabled</p>
                  <p className="text-[13px] text-[#323B42]">
                    Items will be automatically categorized based on their names and your inspection notes.
                    Review the auto-sort suggestions below and adjust the condition assessment as needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(selectedPO.items ?? []).map((item: any) => {
                const inspection = inspectionForm[item.id] ?? {
                  receivedQty: item.quantity,
                  acceptedQty: item.quantity,
                  rejectedQty: 0,
                  condition: 'Good' as const,
                  inspectionNotes: '',
                };
                const autoSort = autoSortItem(item.name, inspection.inspectionNotes);

                return (
                  <div key={item.id} className="bg-[#F8FAFB] border border-[rgba(0,0,0,0.1)] rounded-[12px] p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-[16px] font-semibold text-[#323B42]">{item.name}</h4>
                        <p className="text-[13px] text-[#323B42]">Ordered: {item.quantity} units @ ₱{item.unitPrice ?? 0} each</p>

                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-[#6b7280]">Auto-Sort:</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            autoSort.confidence === 'high' ? 'bg-[#E0F5F1] text-[#008967]' :
                            autoSort.confidence === 'medium' ? 'bg-[#fef3c6] text-[#92400e]' :
                            'bg-[#e9ecef] text-[#6b7280]'
                          }`}>
                            {autoSort.category}
                          </span>
                          <span className="text-[11px] text-[#6b7280]">→</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#e9ecef] text-[#323B42]">
                            {autoSort.targetCustomer}
                          </span>
                          <span className="text-[11px] text-[#6b7280]">→</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#e9ecef] text-[#323B42]">
                            {autoSort.subcategory}
                          </span>
                          {autoSort.confidence === 'low' && (
                            <span className="text-[10px] text-[#E7000B]">(Low Confidence - May need review)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-[12px] font-medium text-[#323B42] mb-2">Received Qty *</label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={inspection.receivedQty}
                          onChange={(e) => handleInspectionChange(item.id, 'receivedQty', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#323B42] mb-2">Accepted Qty *</label>
                        <input
                          type="number"
                          min="0"
                          max={inspection.receivedQty}
                          value={inspection.acceptedQty}
                          onChange={(e) => handleInspectionChange(item.id, 'acceptedQty', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#323B42] mb-2">Rejected Qty</label>
                        <input
                          type="number"
                          value={inspection.rejectedQty}
                          disabled
                          className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] bg-[#e9ecef] cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#323B42] mb-2">
                          Condition *
                          {autoSort.suggestedCondition && autoSort.suggestedCondition !== inspection.condition && (
                            <span className="ml-2 text-[10px] text-[#007A5E] font-normal">
                              (Suggested: {autoSort.suggestedCondition})
                            </span>
                          )}
                        </label>
                        <select
                          value={inspection.condition}
                          onChange={(e) => handleInspectionChange(item.id, 'condition', e.target.value)}
                          className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                        >
                          <option value="Excellent">Excellent</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                          <option value="Damaged">Damaged</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-[#323B42] mb-2">Inspection Notes</label>
                      <textarea
                        value={inspection.inspectionNotes}
                        onChange={(e) => handleInspectionChange(item.id, 'inspectionNotes', e.target.value)}
                        className="w-full px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E] resize-none"
                        rows={2}
                        placeholder="Any issues, defects, or observations..."
                      />
                    </div>

                    {inspection.rejectedQty > 0 && (
                      <div className="mt-3 p-3 bg-[#fff4e6] border border-[#FFA500] rounded-[8px]">
                        <p className="text-[13px] text-[#d08700] font-medium">
                          {inspection.rejectedQty} unit(s) will be rejected
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInspectionModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteInspection}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#007A5E] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Complete Inspection & Receive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">Total Receipts</p>
          <p className="text-[#323B42] text-[24px] font-bold">{loading ? '—' : stats.total}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">Ready to Receive</p>
          <p className="text-[#FFA500] text-[24px] font-bold">{loading ? '—' : stats.readyToReceive}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">Fully Accepted</p>
          <p className="text-[#008967] text-[24px] font-bold">{loading ? '—' : stats.fullyAccepted}</p>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-4">
          <p className="text-[#323B42] text-[12px] mb-1">With Rejections</p>
          <p className="text-[#007A5E] text-[24px] font-bold">{loading ? '—' : stats.withRejections}</p>
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
            <option value="all">All Receipts</option>
            <option value="Fully Accepted">Fully Accepted</option>
            <option value="Partially Accepted">Partially Accepted</option>
          </select>
        </div>
      </div>

      {/* Receipts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
            <p className="text-[14px] text-[#6b7280]">Loading...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-12 text-center">
            <PackageCheck className="size-16 text-[#d1d5dc] mx-auto mb-4" />
            <p className="text-[16px] text-[#323B42] font-medium">No receipts found</p>
            <p className="text-[14px] text-[#6b7280] mt-1">Start receiving purchase orders to see them here</p>
          </div>
        ) : (
          filteredReceipts.map(po => {
            const totalAccepted = poTotalAccepted(po);
            const totalRejected = poTotalRejected(po);
            const status = poStatus(po);
            return (
              <div key={po.id} className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[18px] font-semibold text-[#323B42]">{po.orderNumber}</h3>
                      <span className={`px-3 py-1 rounded text-[12px] font-semibold ${
                        status === 'Fully Accepted' ? 'bg-[#E0F5F1] text-[#008967]' :
                        'bg-[#E0F2F2] text-[#007A5E]'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <p className="text-[14px] text-[#323B42]">Supplier: <span className="font-medium">{po.supplier?.name ?? 'N/A'}</span></p>
                    <p className="text-[14px] text-[#323B42]">Date Received: {po.receivedAt ? new Date(po.receivedAt).toLocaleDateString() : 'N/A'}</p>
                    <p className="text-[14px] text-[#323B42]">Received By: {po.receivedBy?.name ?? 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <div className="bg-[#E0F5F1] rounded-[8px] px-4 py-2 mb-2">
                      <p className="text-[11px] text-[#323B42]">Accepted</p>
                      <p className="text-[20px] font-bold text-[#008967]">{totalAccepted}</p>
                    </div>
                    {totalRejected > 0 && (
                      <div className="bg-[#ffe2e2] rounded-[8px] px-4 py-2">
                        <p className="text-[11px] text-[#323B42]">Rejected</p>
                        <p className="text-[20px] font-bold text-[#E7000B]">{totalRejected}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[rgba(0,0,0,0.1)] pt-4">
                  <p className="text-[14px] font-medium text-[#323B42] mb-3">Items Inspection Results:</p>
                  <div className="space-y-2">
                    {(po.items ?? []).map((item: any) => {
                      const accepted = item.receivedQty - item.rejectedQty;
                      return (
                        <div key={item.id} className="bg-[#F8FAFB] rounded-[8px] p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-[14px] font-medium text-[#323B42]">{item.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[13px] text-[#323B42]">
                                <span className="font-semibold text-[#008967]">{accepted}</span> accepted
                                {item.rejectedQty > 0 && (
                                  <> • <span className="font-semibold text-[#E7000B]">{item.rejectedQty}</span> rejected</>
                                )}
                              </p>
                              <p className="text-[12px] text-[#6b7280]">Ordered: {item.quantity} | Received: {item.receivedQty}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


// Item Bundling View
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
export function UserManagementView({
  users,
  setUsers,
  currentUser
}: {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: { id?: string; name?: string; email: string; role: string } | null;
}) {
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'Staff' as 'Admin' | 'Manager' | 'Staff' | 'Cashier' | 'KitchenStaff' | 'UkayStaff',
    password: '',
    confirmPassword: ''
  });

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'Admin';

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="bg-[#ffe2e2] size-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="size-10 text-[#E7000B]" />
          </div>
          <h3 className="text-[24px] font-bold text-[#323B42] mb-2">Access Denied</h3>
          <p className="text-[14px] text-[#6b7280]">
            You do not have permission to access User Management.<br />
            This section is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const roleMatch = filterRole === 'all' || user.role === filterRole;
    const statusMatch = filterStatus === 'all' || user.status === filterStatus;
    const searchMatch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return roleMatch && statusMatch && searchMatch;
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!userForm.name || !userForm.email || !userForm.password) {
      alert('Please fill in all required fields');
      return;
    }

    if (userForm.password !== userForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (userForm.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === userForm.email.toLowerCase())) {
      alert('A user with this email already exists');
      return;
    }

    try {
      const newUser = await createUser({
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        status: 'Active'
      });

      setUsers([...users, mapApiUser(newUser)]);
      setShowAddModal(false);
      setUserForm({ name: '', email: '', role: 'Staff', password: '', confirmPassword: '' });
      alert(`User ${newUser.name} has been created successfully!`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    if (!userForm.name || !userForm.email) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if email already exists for another user
    if (users.some(u => u.id !== selectedUser.id && u.email.toLowerCase() === userForm.email.toLowerCase())) {
      alert('A user with this email already exists');
      return;
    }

    try {
      const updatedUser = await updateUser(selectedUser.id, {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        status: selectedUser.status
      });

      setUsers(users.map(user =>
        user.id === selectedUser.id ? mapApiUser(updatedUser) : user
      ));

      setShowEditModal(false);
      setSelectedUser(null);
      setUserForm({ name: '', email: '', role: 'Staff', password: '', confirmPassword: '' });
      alert('User updated successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update user');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    if (!userForm.password || !userForm.confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (userForm.password !== userForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (userForm.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      await updateUser(selectedUser.id, { password: userForm.password });
      setShowPasswordModal(false);
      setSelectedUser(null);
      setUserForm({ name: '', email: '', role: 'Staff', password: '', confirmPassword: '' });
      alert(`Password for ${selectedUser.name} has been reset successfully!`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reset password');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';

    if (user.email === currentUser?.email && newStatus === 'Inactive') {
      alert('You cannot deactivate your own account');
      return;
    }

    if (confirm(`Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} ${user.name}?`)) {
      try {
        const updatedUser = await updateUser(user.id, { status: newStatus });
        setUsers(users.map(u =>
          u.id === user.id ? mapApiUser(updatedUser) : u
        ));
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to update user status');
      }
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.email === currentUser?.email) {
      alert('You cannot delete your own account');
      return;
    }

    if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      try {
        await deleteUser(user.id);
        setUsers(users.filter(u => u.id !== user.id));
        alert(`User ${user.name} has been deleted`);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete user');
      }
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      confirmPassword: ''
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      name: '',
      email: '',
      role: 'Staff',
      password: '',
      confirmPassword: ''
    });
    setShowPasswordModal(true);
  };

  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'Active').length,
    inactive: users.filter(u => u.status === 'Inactive').length,
    admins: users.filter(u => u.role === 'Admin').length,
    managers: users.filter(u => u.role === 'Manager').length,
    staff: users.filter(u => u.role === 'Staff').length
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[30px] font-bold text-[#323B42]">User Management</h2>
          <p className="text-[#6b7280] text-[14px] mt-1">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#007A5E] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium flex items-center gap-2 hover:bg-[#008967] transition-colors"
        >
          <Plus className="size-4" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#6b7280] text-[12px] mb-1">Total Users</p>
              <p className="text-[#323B42] text-[28px] font-bold">{userStats.total}</p>
              <div className="flex gap-3 mt-2">
                <span className="text-[11px] text-[#00a63e]">Active: {userStats.active}</span>
                <span className="text-[11px] text-[#E7000B]">Inactive: {userStats.inactive}</span>
              </div>
            </div>
            <div className="bg-[#E0F5F1] rounded-full size-[56px] flex items-center justify-center">
              <Users className="size-7 text-[#007A5E]" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <p className="text-[#6b7280] text-[12px] mb-3">Users by Role</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#323B42]">Admin</span>
              <span className="text-[14px] font-bold text-[#bb4d00]">{userStats.admins}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#323B42]">Manager</span>
              <span className="text-[14px] font-bold text-[#007A5E]">{userStats.managers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#323B42]">Staff</span>
              <span className="text-[14px] font-bold text-[#008967]">{userStats.staff}</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] p-6">
          <p className="text-[#6b7280] text-[12px] mb-1">Active Rate</p>
          <p className="text-[#323B42] text-[28px] font-bold">
            {userStats.total > 0 ? Math.round((userStats.active / userStats.total) * 100) : 0}%
          </p>
          <p className="text-[11px] text-[#6b7280] mt-2">{userStats.active} out of {userStats.total} users active</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] mb-4 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#6b7280]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[14px] text-[#323B42] font-medium">Role:</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-[#007A5E]"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Staff">Staff</option>
              <option value="Cashier">Cashier</option>
              <option value="UkayStaff">Ukay Staff</option>
              <option value="KitchenStaff">Kitchen Staff</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[14px] text-[#323B42] font-medium">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] bg-white focus:outline-none focus:border-[#007A5E]"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[14px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F8FAFB] border-b border-[rgba(0,0,0,0.1)]">
            <tr>
              <th className="text-left px-6 py-3 text-[13px] font-semibold text-[#323B42]">User</th>
              <th className="text-left px-6 py-3 text-[13px] font-semibold text-[#323B42]">Email</th>
              <th className="text-left px-6 py-3 text-[13px] font-semibold text-[#323B42]">Role</th>
              <th className="text-left px-6 py-3 text-[13px] font-semibold text-[#323B42]">Status</th>
              <th className="text-left px-6 py-3 text-[13px] font-semibold text-[#323B42]">Last Login</th>
              <th className="text-left px-6 py-3 text-[13px] font-semibold text-[#323B42]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[#6b7280]">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-[rgba(0,0,0,0.1)] hover:bg-[#F8FAFB] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full size-[40px] flex items-center justify-center ${
                        user.role === 'Admin' ? 'bg-[#fef3c6]' :
                        user.role === 'Manager' ? 'bg-[#E0F2F2]' :
                        'bg-[#E0F5F1]'
                      }`}>
                        <span className="text-[16px] font-semibold text-[#323B42]">{user.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#323B42]">{user.name}</p>
                        {user.email === currentUser?.email && (
                          <span className="text-[11px] text-[#007A5E] font-medium">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-[#323B42]">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[12px] font-semibold ${
                      user.role === 'Admin' ? 'bg-[#fef3c6] text-[#bb4d00]' :
                      user.role === 'Manager' ? 'bg-[#E0F2F2] text-[#007A5E]' :
                      'bg-[#E0F5F1] text-[#008967]'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`px-2 py-1 rounded text-[12px] font-semibold transition-opacity hover:opacity-80 ${
                        user.status === 'Active' ? 'bg-[#E0F5F1] text-[#008967]' : 'bg-[#ffe2e2] text-[#E7000B]'
                      }`}
                    >
                      {user.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-[#323B42]">{user.lastLogin}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 hover:bg-[#E0F2F2] rounded-[6px] text-[#007A5E] transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => openPasswordModal(user)}
                        className="p-2 hover:bg-[#fff4e6] rounded-[6px] text-[#FFA500] transition-colors"
                        title="Reset Password"
                      >
                        <RefreshCw className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 hover:bg-[#ffe2e2] rounded-[6px] text-[#991b1b] transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-[#323B42]">Add New User</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setUserForm({ name: '', email: '', role: 'Staff', password: '', confirmPassword: '' });
                }}
                className="text-[#6b7280] hover:text-[#323B42]"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Full Name <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Email Address <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Role <span className="text-[#E7000B]">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    required
                  >
                    <option value="Staff">Staff</option>
                    <option value="Cashier">Cashier</option>
                    <option value="UkayStaff">Ukay Staff</option>
                    <option value="KitchenStaff">Kitchen Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Password <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Enter password (min. 6 characters)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Confirm Password <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="password"
                    value={userForm.confirmPassword}
                    onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-[#007A5E] text-white py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setUserForm({ name: '', email: '', role: 'Staff', password: '', confirmPassword: '' });
                  }}
                  className="flex-1 border border-[rgba(0,0,0,0.1)] py-2 rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-[#323B42]">Edit User</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  setUserForm({ name: '', email: '', role: 'Staff', password: '', confirmPassword: '' });
                }}
                className="text-[#6b7280] hover:text-[#323B42]"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Full Name <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Email Address <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Role <span className="text-[#E7000B]">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    required
                    disabled={selectedUser.email === currentUser?.email}
                  >
                    <option value="Staff">Staff</option>
                    <option value="Cashier">Cashier</option>
                    <option value="UkayStaff">Ukay Staff</option>
                    <option value="KitchenStaff">Kitchen Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                  {selectedUser.email === currentUser?.email && (
                    <p className="text-[11px] text-[#6b7280] mt-1">You cannot change your own role</p>
                  )}
                </div>

                <div className="bg-[#E0F2F2] border border-[#007A5E] rounded-[8px] p-3">
                  <p className="text-[12px] text-[#007A5E]">
                    <strong>Note:</strong> To change the password, use the "Reset Password" button in the actions menu.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-[#007A5E] text-white py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setUserForm({ name: '', email: '', role: 'Staff', password: '', confirmPassword: '' });
                  }}
                  className="flex-1 border border-[rgba(0,0,0,0.1)] py-2 rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[14px] p-6 w-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-[#323B42]">Reset Password</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                  setUserForm({ name: '', email: '', role: 'Staff', password: '', confirmPassword: '' });
                }}
                className="text-[#6b7280] hover:text-[#323B42]"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-[14px] text-[#6b7280] mb-4">
              Reset password for <strong className="text-[#323B42]">{selectedUser.name}</strong>
            </p>

            <form onSubmit={handleResetPassword}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    New Password <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Enter new password (min. 6 characters)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#323B42] mb-2">
                    Confirm New Password <span className="text-[#E7000B]">*</span>
                  </label>
                  <input
                    type="password"
                    value={userForm.confirmPassword}
                    onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-[rgba(0,0,0,0.1)] rounded-[8px] text-[14px] focus:outline-none focus:border-[#007A5E]"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-[#007A5E] text-white py-2 rounded-[8px] text-[14px] font-medium hover:bg-[#008967] transition-colors"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedUser(null);
                    setUserForm({ name: '', email: '', role: 'Staff', password: '', confirmPassword: '' });
                  }}
                  className="flex-1 border border-[rgba(0,0,0,0.1)] py-2 rounded-[8px] text-[14px] font-medium text-[#323B42] hover:bg-[#F8FAFB] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

