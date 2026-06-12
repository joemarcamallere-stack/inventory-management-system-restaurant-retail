import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Calendar, TrendingUp, Package, PhilippinePeso, ShoppingCart, Filter } from "lucide-react";
import { useRestaurantState } from "../lib/restaurantData";
import { defaultCategoryHierarchy, formatCurrency, getInventoryProducts, getInventoryValue, splitCategory } from "../lib/inventoryLogic";

const goToInventory = () =>
  window.dispatchEvent(new CustomEvent('restaurant-navigate', { detail: 'restaurant-food-inventory' }));

export function Reports() {
  const [dateRange, setDateRange] = useState("30days");
  const [selectedMainCategory, setSelectedMainCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [selectedMainCategory, selectedSubCategory]);

  const [products] = useRestaurantState("inventory.products", getInventoryProducts());
  const [purchaseOrders] = useRestaurantState<{ total: number; status?: string; date?: string }[]>("purchaseOrders.orders", []);
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
  const receiptTrendData = receivedPurchaseOrders.map((order, index) => ({
    date: order.date || `PO ${index + 1}`,
    revenue: order.total,
    orders: 1,
  }));

  const allCategoryPerformance = products.map((product) => {
    const { main, sub } = splitCategory(product.category);
    return {
      id: product.sku,
      category: main,
      subCategory: sub,
      sales: product.stock * product.price,
      percentage: 0,
    };
  });

  // Filter and aggregate category performance
  const filteredCategoryData = allCategoryPerformance.filter(item => {
    const matchesMain = selectedMainCategory === "all" || item.category === selectedMainCategory;
    const matchesSub = selectedSubCategory === "all" || item.subCategory === selectedSubCategory;
    return matchesMain && matchesSub;
  });

  // Determine what to show based on selection
  let categoryPerformance: any[] = [];

  if (selectedSubCategory !== "all") {
    // Show only the selected subcategory
    categoryPerformance = filteredCategoryData.map(item => ({
      id: item.id,
      category: item.subCategory,
      sales: item.sales,
      percentage: 0
    }));
  } else if (selectedMainCategory !== "all") {
    // Show subcategories within the selected main category
    categoryPerformance = filteredCategoryData.map(item => ({
      id: item.id,
      category: item.subCategory,
      sales: item.sales,
      percentage: 0
    }));
  } else {
    // Show main categories (aggregate by main category)
    categoryPerformance = filteredCategoryData.reduce((acc: any[], item) => {
      const existing = acc.find(a => a.category === item.category);
      if (existing) {
        existing.sales += item.sales;
      } else {
        acc.push({
          id: (item.category || '').toLowerCase().replace(/\s+/g, '-'),
          category: item.category,
          sales: item.sales,
          percentage: 0
        });
      }
      return acc;
    }, []);
  }

  // Recalculate percentages
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
      sold: product.stock,
      revenue: product.stock * product.price,
    }));

  const inventoryTurnover = products.map((product) => ({
    month: product.name,
    turnover: product.maxStock > 0 ? Number((product.stock / product.maxStock).toFixed(2)) : 0,
  }));

  const COLORS = ["#ea580c", "#65a30d", "#eab308", "#f59e0b"];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reports & Analytics</h1>
        </div>
        <div className="flex gap-6">
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <select
              value={selectedMainCategory}
              onChange={(e) => handleMainCategoryChange(e.target.value)}
              className="pl-6 pr-4 py-2 text-sm bg-input-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer min-w-[120px]"
            >
              <option value="all">All Categories</option>
              {mainCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {selectedMainCategory !== "all" && (
            <div className="relative">
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="pl-6 pr-4 py-2 text-sm bg-input-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer min-w-[120px]"
              >
                <option value="all">All {selectedMainCategory}</option>
                {currentSubCategories.map((subCat) => (
                  <option key={subCat} value={subCat}>{subCat}</option>
                ))}
              </select>
            </div>
          )}

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-2 py-2 text-sm bg-input-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="year">This Year</option>
          </select>
          <button className="px-4 py-3 bg-primary text-white rounded-2xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8">
        <div className="bg-card rounded-2xl p-2 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <PhilippinePeso className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-green-600 font-medium">+24.5%</span>
          </div>
          <h3 className="text-muted-foreground text-sm mb-6">Inventory Value</h3>
          <p className="text-xl font-bold text-foreground">{formatCurrency(inventoryValue)}</p>
          <p className="text-muted-foreground text-xs mt-2">current inventory value</p>
        </div>

        <div className="bg-card rounded-2xl p-2 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-green-600 font-medium">+18.2%</span>
          </div>
          <h3 className="text-muted-foreground text-sm mb-6">Completed PO Count</h3>
          <p className="text-xl font-bold text-foreground">{receivedPurchaseOrders.length}</p>
          <p className="text-muted-foreground text-xs mt-2">received purchase orders</p>
        </div>

        <div className="bg-card rounded-2xl p-2 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm text-green-600 font-medium">+12.8%</span>
          </div>
          <h3 className="text-muted-foreground text-sm mb-6">Avg. Completed PO Value</h3>
          <p className="text-xl font-bold text-foreground">{formatCurrency(receivedPurchaseOrders.length ? receivedPurchaseOrders.reduce((sum, order) => sum + order.total, 0) / receivedPurchaseOrders.length : 0)}</p>
          <p className="text-muted-foreground text-xs mt-2">average received PO value</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-8">
        {/* Receipt Trend */}
        <div className="bg-card rounded-2xl p-2 shadow-sm border border-border">
          <h2 className="text-xl font-bold text-foreground mb-2">Inventory Receipt Trend</h2>
          <p className="text-sm text-muted-foreground mb-4">This chart is based on received purchase orders, not customer sales invoices.</p>
          {receiptTrendData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              No received purchase order data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={receiptTrendData} key="receipt-bar-chart">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" key="bar-grid" />
                <XAxis dataKey="date" stroke="#64748b" key="bar-x-axis" />
                <YAxis stroke="#64748b" key="bar-y-axis" />
                <Tooltip
                  key="bar-tooltip"
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="revenue" fill="#0ea5e9" radius={[8, 8, 0, 0]} key="revenue-bar" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Performance */}
        <div className="bg-card rounded-2xl p-2 shadow-sm border border-border overflow-hidden">
          <h2 className="text-xl font-bold text-foreground mb-8">Category Performance</h2>
          <ResponsiveContainer width="100%" height={300} key={`reports-container-${chartKey}`}>
            <PieChart key={`reports-piechart-${chartKey}`}>
              <Pie
                key={`reports-pie-${chartKey}`}
                data={categoryPerformance}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="sales"
                nameKey="category"
                label={({ name, percentage }) => {
                  const shortName = name.length > 10 ? name.substring(0, 10) + '...' : name;
                  return `${shortName} ${percentage}%`;
                }}
                isAnimationActive={false}
                onClick={() => goToInventory()}
                cursor="pointer"
              >
                {categoryPerformance.map((entry, index) => (
                  <Cell key={`cell-reports-${chartKey}-${index}-${entry.category}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip key={`reports-pie-tooltip-${chartKey}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-card rounded-2xl p-2 shadow-sm border border-border">
          <h2 className="text-xl font-bold text-foreground mb-8">Top Selling Products</h2>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No products yet</div>
            ) : topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-1.5 p-1.5 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-5 h-5 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.sold} units sold</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{formatCurrency(product.revenue)}</p>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Turnover */}
        <div className="bg-card rounded-2xl p-2 shadow-sm border border-border">
          <h2 className="text-xl font-bold text-foreground mb-8">Inventory Turnover Rate</h2>
          {inventoryTurnover.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              No inventory turnover data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={inventoryTurnover} key="turnover-line-chart">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" key="turnover-grid" />
                <XAxis dataKey="month" stroke="#64748b" key="turnover-x-axis" />
                <YAxis stroke="#64748b" key="turnover-y-axis" />
                <Tooltip
                  key="turnover-tooltip"
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                  }}
                />
                <Line
                  key="turnover-line"
                  type="monotone"
                  dataKey="turnover"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
