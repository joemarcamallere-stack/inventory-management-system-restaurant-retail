import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Calendar, TrendingUp, Package, PhilippinePeso, ShoppingCart, Filter } from "lucide-react";
import { defaultCategoryHierarchy, formatCurrency, getInventoryProducts, getInventoryValue, splitCategory } from "../lib/inventoryLogic";
import { useRestaurantInventoryQuery, useRestaurantPurchaseOrdersQuery } from "../lib/restaurantQueries";

type TabType = 'overview' | 'inventory' | 'orders';

const COLORS = ["#007A5E", "#009BA5", "#F59E0B", "#DC2626", "#8B5CF6", "#EC4899", "#10b981"];

export function Reports() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState("30days");
  const [selectedMainCategory, setSelectedMainCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");

  const productsQuery = useRestaurantInventoryQuery();
  const products = productsQuery.data ?? getInventoryProducts();
  const purchaseOrdersQuery = useRestaurantPurchaseOrdersQuery<{ total: number; status?: string; date?: string }[]>();
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const inventoryValue = getInventoryValue(products);

  const liveCategoryHierarchy = products.reduce<{ [key: string]: string[] }>((acc, product) => {
    const { main, sub } = splitCategory(product.category);
    if (!acc[main]) acc[main] = [];
    if (!acc[main].includes(sub)) acc[main].push(sub);
    return acc;
  }, {});
  const categoryHierarchy = Object.keys(liveCategoryHierarchy).length > 0 ? liveCategoryHierarchy : defaultCategoryHierarchy;
  const mainCategories = Object.keys(categoryHierarchy);
  const currentSubCategories = selectedMainCategory !== "all" && selectedMainCategory in categoryHierarchy
    ? categoryHierarchy[selectedMainCategory]
    : [];

  const handleMainCategoryChange = (category: string) => {
    setSelectedMainCategory(category);
    setSelectedSubCategory("all");
  };

  const receivedPurchaseOrders = purchaseOrders.filter(order => order.status === "received");

  const allCategoryPerformance = products.map((product) => {
    const { main, sub } = splitCategory(product.category);
    return { id: product.sku, category: main, subCategory: sub, sales: product.stock * product.price };
  });

  const filteredCategoryData = allCategoryPerformance.filter(item => {
    const matchesMain = selectedMainCategory === "all" || item.category === selectedMainCategory;
    const matchesSub = selectedSubCategory === "all" || item.subCategory === selectedSubCategory;
    return matchesMain && matchesSub;
  });

  let categoryPerformance: { id: string; category: string; sales: number; percentage: number }[] = [];
  if (selectedSubCategory !== "all" || selectedMainCategory !== "all") {
    const grouped: { [key: string]: number } = {};
    filteredCategoryData.forEach(item => {
      const key = selectedSubCategory !== "all" ? item.subCategory : item.subCategory;
      grouped[key] = (grouped[key] || 0) + item.sales;
    });
    categoryPerformance = Object.entries(grouped).map(([category, sales]) => ({
      id: category.toLowerCase().replace(/\s+/g, '-'),
      category,
      sales,
      percentage: 0,
    }));
  } else {
    const grouped: { [key: string]: number } = {};
    filteredCategoryData.forEach(item => {
      grouped[item.category] = (grouped[item.category] || 0) + item.sales;
    });
    categoryPerformance = Object.entries(grouped).map(([category, sales]) => ({
      id: category.toLowerCase().replace(/\s+/g, '-'),
      category,
      sales,
      percentage: 0,
    }));
  }

  const totalSales = categoryPerformance.reduce((sum, item) => sum + item.sales, 0);
  categoryPerformance.forEach(item => {
    item.percentage = totalSales > 0 ? Math.round((item.sales / totalSales) * 100) : 0;
  });

  const topProducts = [...products]
    .sort((a, b) => b.stock * b.price - a.stock * a.price)
    .slice(0, 5)
    .map((product) => ({
      id: product.sku,
      name: product.name,
      stock: product.stock,
      unit: product.unit || "pcs",
      revenue: product.stock * product.price,
    }));

  const categoryStats: { [key: string]: { quantity: number; value: number; items: number } } = {};
  products.forEach(product => {
    const { main } = splitCategory(product.category);
    if (!categoryStats[main]) categoryStats[main] = { quantity: 0, value: 0, items: 0 };
    categoryStats[main].quantity += product.stock;
    categoryStats[main].value += product.stock * product.price;
    categoryStats[main].items += 1;
  });

  const receiptTrendData = receivedPurchaseOrders.map((order, index) => ({
    date: order.date || `PO ${index + 1}`,
    value: order.total,
  }));

  const handleExport = () => {
    let csvContent = "Report: Restaurant Analytics\n\n";
    csvContent += "Category Performance\nCategory,Sales Value,Percentage\n";
    categoryPerformance.forEach(item => {
      csvContent += `${item.category},${item.sales.toFixed(2)},${item.percentage}%\n`;
    });
    csvContent += "\nTop Products\nSKU,Name,Stock,Revenue\n";
    topProducts.forEach(p => {
      csvContent += `${p.id},${p.name},${p.stock} ${p.unit},${p.revenue.toFixed(2)}\n`;
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `restaurant_report_${dateRange}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Inventory value, receipt trends, and category performance</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={handleExport}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'inventory' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          Inventory Report
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'orders' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          Purchase Orders
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">System Overview</h3>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <PhilippinePeso className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-green-600 font-medium">+24.5%</span>
              </div>
              <p className="text-muted-foreground text-sm mb-1">Inventory Value</p>
              <p className="text-2xl font-bold text-foreground break-words">{formatCurrency(inventoryValue)}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-green-600 font-medium">+18.2%</span>
              </div>
              <p className="text-muted-foreground text-sm mb-1">Completed Orders</p>
              <p className="text-2xl font-bold text-foreground">{receivedPurchaseOrders.length}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-green-600 font-medium">+12.8%</span>
              </div>
              <p className="text-muted-foreground text-sm mb-1">Avg. Order Value</p>
              <p className="text-2xl font-bold text-foreground break-words">
                {formatCurrency(receivedPurchaseOrders.length
                  ? receivedPurchaseOrders.reduce((sum, o) => sum + o.total, 0) / receivedPurchaseOrders.length
                  : 0)}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category Performance */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-foreground">Category Performance</h4>
                <div className="flex gap-2">
                  <select
                    value={selectedMainCategory}
                    onChange={(e) => handleMainCategoryChange(e.target.value)}
                    className="text-xs bg-card border border-border rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {mainCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {selectedMainCategory !== "all" && (
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => setSelectedSubCategory(e.target.value)}
                      className="text-xs bg-card border border-border rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="all">All {selectedMainCategory}</option>
                      {currentSubCategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  )}
                </div>
              </div>
              {categoryPerformance.length > 0 ? (
                <div className="flex items-center gap-4">
                  <PieChart width={180} height={180}>
                    <Pie
                      data={categoryPerformance}
                      cx={90}
                      cy={90}
                      labelLine={false}
                      label={false}
                      outerRadius={75}
                      dataKey="sales"
                      nameKey="category"
                      isAnimationActive={false}
                    >
                      {categoryPerformance.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value: number) => [formatCurrency(value), 'Value']}
                    />
                  </PieChart>
                  <div className="flex-1 space-y-2 min-w-0">
                    {categoryPerformance.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-xs text-foreground truncate">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                  No data available
                </div>
              )}
            </div>

            {/* Receipt Trend */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h4 className="text-base font-semibold text-foreground mb-1">Receipt Trend</h4>
              <p className="text-xs text-muted-foreground mb-4">Based on received purchase orders.</p>
              {receiptTrendData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  No received purchase order data yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <BarChart
                    width={Math.max(300, receiptTrendData.length * 55)}
                    height={200}
                    data={receiptTrendData}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(value: number) => [formatCurrency(value), 'Total']}
                    />
                    <Bar dataKey="value" fill="#009BA5" radius={[6, 6, 0, 0]} name="Total Value" />
                  </BarChart>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Report Tab */}
      {activeTab === 'inventory' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Inventory Report</h3>
          </div>

          {/* Category Breakdown */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-4">
            <h4 className="text-base font-semibold text-foreground mb-4">Inventory by Category</h4>
            <div className="space-y-3">
              {Object.entries(categoryStats)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([category, data]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{category}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">{data.quantity} units in stock</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{data.items} unique products</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-bold text-primary">{formatCurrency(data.value)}</p>
                      <p className="text-xs text-muted-foreground">
                        {inventoryValue > 0 ? ((data.value / inventoryValue) * 100).toFixed(1) : '0'}% of total
                      </p>
                    </div>
                  </div>
                ))}
              {Object.keys(categoryStats).length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">No inventory data yet</div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h4 className="text-base font-semibold text-foreground mb-4">Top Products by Value</h4>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No products yet</div>
              ) : topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.stock} {product.unit} in stock</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Purchase Orders Report</h3>
          </div>

          {/* PO Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="text-muted-foreground text-xs mb-2">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">{purchaseOrders.length}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="text-muted-foreground text-xs mb-2">Received Orders</p>
              <p className="text-2xl font-bold text-primary">{receivedPurchaseOrders.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {purchaseOrders.length > 0
                  ? ((receivedPurchaseOrders.length / purchaseOrders.length) * 100).toFixed(0)
                  : 0}% completion rate
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 overflow-hidden">
              <p className="text-muted-foreground text-xs mb-2">Total Value Received</p>
              <p className="text-2xl font-bold text-foreground break-words">
                {formatCurrency(receivedPurchaseOrders.reduce((sum, o) => sum + o.total, 0))}
              </p>
            </div>
          </div>

          {/* Receipt Trend Chart */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-4">
            <h4 className="text-base font-semibold text-foreground mb-1">Receipt Trend</h4>
            <p className="text-xs text-muted-foreground mb-4">Based on received purchase orders.</p>
            {receiptTrendData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No received purchase order data yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <BarChart
                  width={Math.max(400, receiptTrendData.length * 60)}
                  height={220}
                  data={receiptTrendData}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                  />
                  <Bar dataKey="value" fill="#009BA5" radius={[6, 6, 0, 0]} name="Total Value" />
                </BarChart>
              </div>
            )}
          </div>

          {/* PO History Table */}
          {purchaseOrders.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h4 className="text-base font-semibold text-foreground mb-4">Order History</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="pb-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="pb-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchaseOrders.map((order, index) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 text-sm text-foreground">{order.date || `PO ${index + 1}`}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                            order.status === 'received'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status || 'pending'}
                          </span>
                        </td>
                        <td className="py-3 text-sm font-medium text-foreground text-right">{formatCurrency(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {purchaseOrders.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-1">No Purchase Orders</h3>
              <p className="text-sm text-muted-foreground">Purchase orders will appear here once created.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
