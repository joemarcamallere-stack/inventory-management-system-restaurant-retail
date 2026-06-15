import { lazy, useState, useEffect } from 'react';
import { LayoutDashboard, AlertTriangle, Package, ShoppingCart, PackageCheck, Layers, ArrowRightLeft, MapPin, FileText, Users, LogOut, Store, UtensilsCrossed } from 'lucide-react';
import logoImage from '../imports/ims-logo.png';
import LoginPage from './components/LoginPage';
import { RestaurantLayout } from '../modules/restaurant/RestaurantLayout';
import { useSession } from './hooks/useSession';
import { useViewNavigation, type ViewType } from './hooks/useViewNavigation';
import { useRetailWorkspace } from './hooks/useRetailWorkspace';

const TransfersView = lazy(() => import('../modules/retail/TransfersView'));
const MultilocationView = lazy(() => import('../modules/retail/MultilocationView'));
const PurchaseOrdersView = lazy(() => import('../modules/retail/PurchaseOrdersView'));
const POSView = lazy(() => import('../modules/retail/POSView'));
const DashboardView = lazy(() => import('../modules/retail/RetailViews').then((module) => ({ default: module.DashboardView })));
const StockAlertsView = lazy(() => import('../modules/retail/RetailViews').then((module) => ({ default: module.StockAlertsView })));
const InventoryView = lazy(() => import('../modules/retail/RetailViews').then((module) => ({ default: module.InventoryView })));
const ProductsReceivedView = lazy(() => import('../modules/retail/RetailViews').then((module) => ({ default: module.ProductsReceivedView })));
const ItemBundlingView = lazy(() => import('../modules/retail/RetailViews').then((module) => ({ default: module.ItemBundlingView })));
const ReportsView = lazy(() => import('../modules/retail/RetailViews').then((module) => ({ default: module.ReportsView })));
const UserManagementView = lazy(() => import('../modules/retail/RetailViews').then((module) => ({ default: module.UserManagementView })));
const RestaurantDashboard = lazy(() => import('../modules/restaurant/Dashboard').then((module) => ({ default: module.Dashboard })));
const RestaurantStockControl = lazy(() => import('../modules/restaurant/StockControl').then((module) => ({ default: module.StockControl })));
const RestaurantInventory = lazy(() => import('../modules/restaurant/Inventory').then((module) => ({ default: module.Inventory })));
const RestaurantAddProduct = lazy(() => import('../modules/restaurant/AddProduct').then((module) => ({ default: module.AddProduct })));
const RestaurantPurchaseOrders = lazy(() => import('../modules/restaurant/PurchaseOrders').then((module) => ({ default: module.PurchaseOrders })));
const RestaurantGoodsReceived = lazy(() => import('../modules/restaurant/GoodsReceived').then((module) => ({ default: module.GoodsReceived })));
const RestaurantPOSKitchenOrders = lazy(() => import('../modules/restaurant/POSKitchenOrders').then((module) => ({ default: module.POSKitchenOrders })));
const RestaurantRecipeBOM = lazy(() => import('../modules/restaurant/RecipeBOM').then((module) => ({ default: module.RecipeBOM })));
const RestaurantTransfers = lazy(() => import('../modules/restaurant/Transfers').then((module) => ({ default: module.Transfers })));
const RestaurantReports = lazy(() => import('../modules/restaurant/Reports').then((module) => ({ default: module.Reports })));
const RestaurantMultiLocation = lazy(() => import('../modules/restaurant/MultiLocation').then((module) => ({ default: module.MultiLocation })));
const RestaurantUserManagement = lazy(() => import('../modules/restaurant/UserManagement').then((module) => ({ default: module.UserManagement })));

export default function App() {
  const {
    currentUser,
    isLoggedIn,
    isRestoringSession,
    login,
    logout,
  } = useSession();
  const { currentView, setCurrentView, navigateToView } = useViewNavigation();
  const hasRestaurantModule = currentUser?.modules?.includes('RESTAURANT') ?? false;
  const hasRetailModule = currentUser?.modules?.includes('RETAIL') ?? false;
  const hasBothModules = hasRestaurantModule && hasRetailModule;
  const [activeModule, setActiveModule] = useState<'RETAIL' | 'RESTAURANT'>('RETAIL');
  const retailEnabled = isLoggedIn && hasRetailModule;
  const {
    inventory,
    locations,
    users,
    purchaseOrders,
    productsReceived,
    transfers,
    adjustments,
    stats,
    stockAlerts,
    filteredInventory,
    formData,
    setFormData,
    searchTerm,
    setSearchTerm,
    editingId,
    showEditModal,
    expandedCategories,
    expandedSubcategories,
    handleEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleDelete,
    toggleCategory,
    toggleSubcategory,
  } = useRetailWorkspace({
    enabled: retailEnabled,
    loadSharedData: isLoggedIn,
    loadUsers: isLoggedIn && currentUser?.role === 'Admin',
  });
  // When user logs in and has only RESTAURANT module, switch to it automatically
  useEffect(() => {
    if (hasRestaurantModule && currentView.startsWith('restaurant-')) {
      setActiveModule('RESTAURANT');
    } else if (hasRestaurantModule && !hasRetailModule) {
      setActiveModule('RESTAURANT');
    } else {
      setActiveModule('RETAIL');
    }
  }, [currentView, hasRestaurantModule, hasRetailModule]);

  // When switching modules, navigate to the appropriate default view
  const switchModule = (module: 'RETAIL' | 'RESTAURANT') => {
    setActiveModule(module);
    navigateToView(module === 'RESTAURANT' ? 'restaurant-dashboard' : 'dashboard');
  };

  // Global handler to remove leading zeros from number inputs
  useEffect(() => {
    const handleNumberInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.type === 'number' && input.value && input.value !== '0') {
        // Remove leading zeros
        const cleaned = input.value.replace(/^0+/, '') || '0';
        if (cleaned !== input.value) {
          input.value = cleaned;
          // Trigger change event to update React state
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    // Add event listener to all number inputs on blur
    document.addEventListener('blur', handleNumberInput, true);

    return () => {
      document.removeEventListener('blur', handleNumberInput, true);
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentView('dashboard');
  };

  if (isRestoringSession) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Restoring session...</div>;
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (activeModule === 'RESTAURANT' && hasRestaurantModule) {
    const restaurantContent = (() => {
      switch (currentView) {
        case 'restaurant-dashboard':
        case 'restaurant-ingredients':
          return <RestaurantDashboard />;
        case 'restaurant-stock-control':
        case 'restaurant-spoilage':
          return <RestaurantStockControl />;
        case 'restaurant-food-inventory':
        case 'restaurant-menu-items':
          return <RestaurantInventory />;
        case 'restaurant-add-food-item':
          return <RestaurantAddProduct />;
        case 'restaurant-purchase-orders':
          return <RestaurantPurchaseOrders />;
        case 'restaurant-goods-received':
          return <RestaurantGoodsReceived />;
        case 'restaurant-pos':
        case 'restaurant-kitchen-orders':
          return <RestaurantPOSKitchenOrders />;
        case 'restaurant-recipe-bom':
        case 'restaurant-recipes':
          return <RestaurantRecipeBOM />;
        case 'restaurant-transfers':
          return <RestaurantTransfers />;
        case 'restaurant-multilocation':
          return <RestaurantMultiLocation />;
        case 'restaurant-reports':
          return <RestaurantReports />;
        case 'user-management':
          return <RestaurantUserManagement />;
        default:
          return <RestaurantDashboard />;
      }
    })();

    return (
      <RestaurantLayout
        currentView={currentView}
        user={currentUser}
        hasBothModules={hasBothModules}
        onNavigate={(view) => navigateToView(view as ViewType)}
        onSwitchToRetail={() => switchModule('RETAIL')}
        onLogout={handleLogout}
      >
        {restaurantContent}
      </RestaurantLayout>
    );
  }

  return (
    <div className="bg-[#F8FAFB] h-screen w-screen overflow-hidden flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <div className="h-full w-[256px] flex flex-col" style={{ background: "#003534" }}>
        {/* Header */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-white rounded-full size-[40px] flex items-center justify-center shadow-sm overflow-hidden">
            <img src={logoImage} alt="IMS Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <p className="text-white text-[20px] leading-[28px]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
              Bukolabs.io
            </p>
            <p className="text-[#00A7A5] text-[12px] leading-[16px]" style={{ fontFamily: 'Inter, sans-serif' }}>Retail</p>
          </div>
        </div>

        {/* Module switch â€” only shown when business has BOTH modules */}
        {hasBothModules && (
          <div className="px-4 pb-3 flex gap-2">
            <button
              onClick={() => switchModule('RETAIL')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${activeModule === 'RETAIL' ? 'bg-[#007A5E] text-white' : 'bg-[rgba(255,255,255,0.08)] text-[#a0c4bf] hover:bg-[rgba(255,255,255,0.14)]'}`}
            >
              <Store className="size-3.5" />
              Retail
            </button>
            <button
              onClick={() => switchModule('RESTAURANT')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${activeModule === 'RESTAURANT' ? 'bg-[#007A5E] text-white' : 'bg-[rgba(255,255,255,0.08)] text-[#a0c4bf] hover:bg-[rgba(255,255,255,0.14)]'}`}
            >
              <UtensilsCrossed className="size-3.5" />
              Restaurant
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-6 pb-4 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Retail navigation */}
          {activeModule === 'RETAIL' && (
            <>
              <NavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')}>
                <DashboardIcon />
                Dashboard
              </NavButton>
              <NavButton active={currentView === 'stock-alerts'} onClick={() => setCurrentView('stock-alerts')}>
                <StockAlertsIcon />
                Stock Alerts
                {stockAlerts.length > 0 && (
                  <span className="ml-auto bg-[#009BA5] text-white text-xs rounded-full px-2 py-0.5">
                    {stockAlerts.length}
                  </span>
                )}
              </NavButton>
              <NavButton active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')}>
                <InventoryIcon />
                Inventory
                {stats.totalItems > 0 && (
                  <span className="ml-auto bg-[rgba(255,255,255,0.2)] text-white text-xs rounded-full px-2 py-0.5">
                    {stats.totalItems}
                  </span>
                )}
              </NavButton>
              <NavButton active={currentView === 'purchase-orders'} onClick={() => setCurrentView('purchase-orders')}>
                <PurchaseOrdersIcon />
                Purchase Orders
              </NavButton>
              <NavButton active={currentView === 'products-received'} onClick={() => setCurrentView('products-received')}>
                <ProductsReceivedIcon />
                Products Received
              </NavButton>
              <NavButton active={currentView === 'item-bundling'} onClick={() => setCurrentView('item-bundling')}>
                <ItemBundlingIcon />
                Item Bundling
              </NavButton>
              <NavButton active={currentView === 'transfers'} onClick={() => setCurrentView('transfers')}>
                <TransfersIcon />
                Transfers
              </NavButton>
              <NavButton active={currentView === 'multilocation'} onClick={() => setCurrentView('multilocation')}>
                <MultilocationIcon />
                Multilocation
              </NavButton>
              <NavButton active={currentView === 'reports'} onClick={() => setCurrentView('reports')}>
                <ReportsIcon />
                Reports
              </NavButton>
            </>
          )}

          {currentUser?.role === 'Admin' && (
            <NavButton active={currentView === 'user-management'} onClick={() => setCurrentView('user-management')}>
              <UserManagementIcon />
              User Management
            </NavButton>
          )}
        </nav>

        {/* User Profile */}
        <div className="bg-[#005656] border-t border-[rgba(255,255,255,0.1)] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-[#008967] rounded-full size-[40px] flex items-center justify-center">
              <p className="text-white text-[16px]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                {currentUser?.email.charAt(0).toUpperCase()}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-white text-[14px] leading-[20px]" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                {currentUser?.email.split('@')[0]}
              </p>
              <p className="text-[#00A7A5] text-[12px] leading-[16px] capitalize" style={{ fontFamily: 'Inter, sans-serif' }}>
                {currentUser?.role.toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-[8px] h-[36px] w-full flex items-center justify-center gap-2 text-white text-[14px] hover:bg-[#007A5E] transition-colors"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#005656] border-b border-[rgba(255,255,255,0.1)] px-6 py-4 flex items-center">
          <h1 className="text-white text-[20px] leading-[28px] flex-1" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
            {currentView.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </h1>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {currentView === 'dashboard' && (
            <DashboardView
              stats={stats}
              stockAlerts={stockAlerts}
              inventory={inventory}
              purchaseOrders={purchaseOrders}
              productsReceived={productsReceived}
            />
          )}
          {currentView === 'stock-alerts' && (
            <StockAlertsView alerts={stockAlerts} inventory={inventory} />
          )}
          {currentView === 'inventory' && (
            <InventoryView
              inventory={filteredInventory}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onEdit={handleEdit}
              onDelete={handleDelete}
              expandedCategories={expandedCategories}
              expandedSubcategories={expandedSubcategories}
              toggleCategory={toggleCategory}
              toggleSubcategory={toggleSubcategory}
              showEditModal={showEditModal}
              editingId={editingId}
              formData={formData}
              setFormData={setFormData}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              locations={locations}
            />
          )}
          {currentView === 'pos' && <POSView currentUser={currentUser} />}
          {currentView === 'purchase-orders' && <PurchaseOrdersView currentUser={currentUser} />}
          {currentView === 'products-received' && <ProductsReceivedView currentUser={currentUser} />}
          {currentView === 'item-bundling' && <ItemBundlingView currentUser={currentUser} />}
          {currentView === 'transfers' && (
            <TransfersView currentUser={currentUser} />
          )}
          {currentView === 'multilocation' && (
            <MultilocationView
              locations={locations}
              inventory={inventory}
              transfers={transfers}
              purchaseOrders={purchaseOrders}
            />
          )}
          {currentView === 'reports' && (
            <ReportsView
              inventory={inventory}
              transfers={transfers}
              adjustments={adjustments}
              purchaseOrders={purchaseOrders}
              productsReceived={productsReceived}
              locations={locations}
              users={users}
              currentUser={currentUser}
            />
          )}
          {currentView === 'user-management' && (
            <UserManagementView
              currentUser={currentUser}
            />
          )}
        </div>
      </div>
    </div>
  );
}



// Navigation Button Component
function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-[10px] mt-2 text-[16px] transition-colors ${
        active
          ? 'bg-[#009BA5] text-white font-medium'
          : 'text-[#e5e7eb] hover:bg-[rgba(255,255,255,0.05)] font-normal'
      }`}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </button>
  );
}

// Icon components using lucide-react
const DashboardIcon = () => <LayoutDashboard className="size-5" />;
const StockAlertsIcon = () => <AlertTriangle className="size-5" />;
const InventoryIcon = () => <Package className="size-5" />;
const PurchaseOrdersIcon = () => <ShoppingCart className="size-5" />;
const ProductsReceivedIcon = () => <PackageCheck className="size-5" />;
const ItemBundlingIcon = () => <Layers className="size-5" />;
const TransfersIcon = () => <ArrowRightLeft className="size-5" />;
const MultilocationIcon = () => <MapPin className="size-5" />;
const ReportsIcon = () => <FileText className="size-5" />;
const UserManagementIcon = () => <Users className="size-5" />;
const LogoutIcon = () => <LogOut className="size-4" />;

