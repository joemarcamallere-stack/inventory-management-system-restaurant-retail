import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  PackageCheck,
  Receipt,
  Settings2,
  ShoppingCart,
  Store,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import logoImage from '../imports/ims-logo.png';
import LoginPage from './components/LoginPage';
import { RestaurantLayout } from '../modules/restaurant/RestaurantLayout';
import { POSShell } from '../modules/shared/pos/shell/POSShell';
import { useSession } from './hooks/useSession';
import { useViewNavigation, type ViewType } from './hooks/useViewNavigation';
import { useRetailInventoryQuery } from '../modules/lib/retail';

const TransfersView = lazy(() => import('../modules/retail/TransfersView'));
const MultilocationView = lazy(() => import('../modules/retail/MultilocationView'));
const PurchaseOrdersView = lazy(() => import('../modules/retail/PurchaseOrdersView'));
const ProductManagementView = lazy(() => import('../modules/retail/ProductManagementView'));
const RetailPOSDashboardView = lazy(() => import('../modules/retail/pos/dashboard/POSDashboardView'));
const RetailPOSSettingsView = lazy(() => import('../modules/retail/pos/settings/POSSettingsView'));
const RetailCreateOrderView = lazy(() => import('../modules/retail/pos/create-order/RetailCreateOrderView'));
const RetailOrderListView = lazy(() => import('../modules/retail/pos/order-list/RetailOrderListView'));
const RetailReceiptView = lazy(() => import('../modules/retail/pos/receipt/RetailReceiptView'));
const POSView = lazy(() => import('../modules/retail/pos/POSView'));
const DashboardView = lazy(() => import('../modules/retail/RetailViews').then(m => ({ default: m.DashboardView })));
const StockAlertsView = lazy(() => import('../modules/retail/RetailViews').then(m => ({ default: m.StockAlertsView })));
const InventoryView = lazy(() => import('../modules/retail/RetailViews').then(m => ({ default: m.InventoryView })));
const ProductsReceivedView = lazy(() => import('../modules/retail/RetailViews').then(m => ({ default: m.ProductsReceivedView })));
const ItemBundlingView = lazy(() => import('../modules/retail/RetailViews').then(m => ({ default: m.ItemBundlingView })));
const ReportsView = lazy(() => import('../modules/retail/reports/ReportsView'));
const UserManagementView = lazy(() => import('../modules/retail/RetailViews').then(m => ({ default: m.UserManagementView })));
const RestaurantDashboard = lazy(() => import('../modules/restaurant/Dashboard').then(m => ({ default: m.Dashboard })));
const RestaurantStockControl = lazy(() => import('../modules/restaurant/StockControl').then(m => ({ default: m.StockControl })));
const RestaurantInventory = lazy(() => import('../modules/restaurant/Inventory').then(m => ({ default: m.Inventory })));
const RestaurantProductManagement = lazy(() => import('../modules/restaurant/ProductManagement').then(m => ({ default: m.ProductManagement })));
const RestaurantPurchaseOrders = lazy(() => import('../modules/restaurant/PurchaseOrders').then(m => ({ default: m.PurchaseOrders })));
const RestaurantGoodsReceived = lazy(() => import('../modules/restaurant/GoodsReceived').then(m => ({ default: m.GoodsReceived })));
const RestaurantPOSDashboardView = lazy(() => import('../modules/restaurant/pos/dashboard/POSDashboardView'));
const RestaurantPOSSettingsView = lazy(() => import('../modules/restaurant/pos/settings/POSSettingsView'));
const POSStaffAccountsView = lazy(() => import('../modules/shared/pos/staff/POSStaffAccountsView'));
const POSAdminManagementView = lazy(() => import('../modules/shared/pos/admin/POSAdminManagementView'));
const RestaurantCreateOrderView = lazy(() => import('../modules/restaurant/pos/create-order/CreateOrderView'));
const RestaurantPaymentView = lazy(() => import('../modules/restaurant/pos/payment/PaymentView'));
const RestaurantReceiptView = lazy(() => import('../modules/restaurant/pos/receipt/ReceiptView'));
const RestaurantOrderListView = lazy(() => import('../modules/restaurant/pos/order-list/OrderListView'));
const RestaurantKitchenQueueView = lazy(() => import('../modules/restaurant/pos/kitchen-queue/KitchenQueueView'));
const RestaurantTableManagementView = lazy(() => import('../modules/restaurant/pos/tables/TableManagementView'));
const RestaurantPOSView = lazy(() => import('../modules/restaurant/pos/RestaurantPOSView'));
const RestaurantRecipeBOM = lazy(() => import('../modules/restaurant/RecipeBOM').then(m => ({ default: m.RecipeBOM })));
const RestaurantTransfers = lazy(() => import('../modules/restaurant/Transfers').then(m => ({ default: m.Transfers })));
const RestaurantReports = lazy(() => import('../modules/restaurant/reports/ReportsView'));
const RestaurantMultiLocation = lazy(() => import('../modules/restaurant/MultiLocation').then(m => ({ default: m.MultiLocation })));
const RestaurantUserManagement = lazy(() => import('../modules/restaurant/UserManagement').then(m => ({ default: m.UserManagement })));

const retailViewRoles: Partial<Record<ViewType, string[]>> = {
  dashboard: ['Admin', 'Manager', 'Staff', 'RetailStaff'],
  'stock-alerts': ['Admin', 'Manager', 'Staff', 'RetailStaff'],
  inventory: ['Admin', 'Manager', 'Staff', 'RetailStaff'],
  'product-management': ['Admin', 'Manager'],
  'pos-dashboard': ['Admin', 'Manager', 'Staff', 'Cashier', 'RetailStaff'],
  'pos-settings': ['Admin', 'Manager'],
  'pos-staff-accounts': ['Admin'],
  pos: ['Admin', 'Manager', 'Staff', 'Cashier', 'RetailStaff'],
  'retail-create-order': ['Admin', 'Manager', 'Staff', 'Cashier', 'RetailStaff'],
  'retail-order-list': ['Admin', 'Manager', 'Staff', 'Cashier', 'RetailStaff'],
  'retail-thermal-receipt': ['Admin', 'Manager', 'Staff', 'Cashier', 'RetailStaff'],
  'sales-history': ['Admin', 'Manager', 'Staff', 'Cashier', 'RetailStaff'],
  'purchase-orders': ['Admin', 'Manager', 'Staff'],
  'products-received': ['Admin', 'Manager', 'Staff'],
  'item-bundling': ['Admin', 'Manager'],
  transfers: ['Admin', 'Manager', 'Staff'],
  multilocation: ['Admin', 'Manager'],
  reports: ['Admin', 'Manager'],
  'user-management': ['Admin'],
};

const restaurantViewRoles: Partial<Record<ViewType, string[]>> = {
  'restaurant-dashboard': ['Admin', 'Manager', 'Staff'],
  'restaurant-ingredients': ['Admin', 'Manager', 'Staff'],
  'restaurant-menu-items': ['Admin', 'Manager', 'Staff'],
  'restaurant-recipes': ['Admin', 'Manager', 'Staff'],
  'restaurant-spoilage': ['Admin', 'Manager', 'Staff'],
  'restaurant-stock-control': ['Admin', 'Manager', 'Staff'],
  'restaurant-food-inventory': ['Admin', 'Manager', 'Staff'],
  'restaurant-product-management': ['Admin'],
  'restaurant-purchase-orders': ['Admin', 'Manager', 'Staff'],
  'restaurant-goods-received': ['Admin', 'Manager', 'Staff'],
  'restaurant-pos-dashboard': ['Admin', 'Manager', 'Staff', 'Cashier', 'KitchenStaff'],
  'restaurant-pos-settings': ['Admin', 'Manager'],
  'restaurant-staff-accounts': ['Admin'],
  'restaurant-store-information': ['Admin'],
  'restaurant-store-settings': ['Admin'],
  'restaurant-pos-categories': ['Admin'],
  'restaurant-pos-products': ['Admin'],
  'restaurant-pos-ingredients': ['Admin'],
  'restaurant-pos-history': ['Admin', 'Manager', 'Staff', 'Cashier'],
  'restaurant-create-order': ['Admin', 'Manager', 'Staff', 'Cashier'],
  'restaurant-payment': ['Admin', 'Manager', 'Staff', 'Cashier'],
  'restaurant-receipt': ['Admin', 'Manager', 'Staff', 'Cashier'],
  'restaurant-order-list': ['Admin', 'Manager', 'Staff', 'Cashier'],
  'restaurant-kitchen-queue': ['Admin', 'Manager', 'Staff', 'KitchenStaff'],
  'restaurant-table-management': ['Admin', 'Manager', 'Staff'],
  'restaurant-pos': ['Admin', 'Manager', 'Staff', 'Cashier'],
  'restaurant-kitchen-orders': ['Admin', 'Manager', 'Staff', 'KitchenStaff'],
  'restaurant-recipe-bom': ['Admin', 'Manager', 'Staff', 'KitchenStaff'],
  'restaurant-transfers': ['Admin', 'Manager', 'Staff'],
  'restaurant-reports': ['Admin', 'Manager'],
  'restaurant-multilocation': ['Admin', 'Manager'],
  'user-management': ['Admin'],
};

const retailDefaultViewByRole: Record<string, ViewType> = {
  Admin: 'dashboard',
  Manager: 'dashboard',
  Staff: 'dashboard',
  RetailStaff: 'retail-create-order',
  Cashier: 'retail-create-order',
  KitchenStaff: 'dashboard',
};

const restaurantDefaultViewByRole: Record<string, ViewType> = {
  Admin: 'restaurant-dashboard',
  Manager: 'restaurant-dashboard',
  Staff: 'restaurant-dashboard',
  Cashier: 'restaurant-create-order',
  KitchenStaff: 'restaurant-kitchen-queue',
  RetailStaff: 'restaurant-dashboard',
};

const retailPOSViews = new Set<ViewType>([
  'pos-dashboard',
  'pos-settings',
  'pos-staff-accounts',
  'pos',
  'retail-create-order',
  'retail-order-list',
  'retail-thermal-receipt',
  'sales-history',
  'reports',
]);

const retailPOSActiveViews: Partial<Record<ViewType, ViewType[]>> = {
  'retail-create-order': ['retail-create-order', 'pos'],
  'retail-order-list': ['retail-order-list', 'sales-history'],
};

function canAccessView(view: ViewType, role: string, module: 'RETAIL' | 'RESTAURANT') {
  const roles = module === 'RESTAURANT' ? restaurantViewRoles[view] : retailViewRoles[view];
  return Boolean(roles?.includes(role));
}

function defaultViewFor(role: string, module: 'RETAIL' | 'RESTAURANT') {
  return module === 'RESTAURANT'
    ? restaurantDefaultViewByRole[role] ?? 'restaurant-dashboard'
    : retailDefaultViewByRole[role] ?? 'dashboard';
}

export default function App() {
  const { currentUser, isLoggedIn, isRestoringSession, login, logout } = useSession();
  const { currentView, navigateToView } = useViewNavigation();
  const hasRestaurantModule = currentUser?.modules?.includes('RESTAURANT') ?? false;
  const hasRetailModule = currentUser?.modules?.includes('RETAIL') ?? false;
  const hasBothModules = hasRestaurantModule && hasRetailModule;
  const [activeModule, setActiveModule] = useState<'RETAIL' | 'RESTAURANT'>('RETAIL');
  const resolvedActiveModule = hasRestaurantModule && !hasRetailModule ? 'RESTAURANT' : activeModule;
  const currentRole = currentUser?.role ?? 'Staff';
  const isRetailPOSWorkspace = resolvedActiveModule === 'RETAIL' && retailPOSViews.has(currentView);

  const { data: navInventory = [] } = useRetailInventoryQuery(isLoggedIn && hasRetailModule);
  const retailNavStats = useMemo(
    () => ({
      totalItems: navInventory.reduce((sum, item) => sum + item.quantity, 0),
    }),
    [navInventory],
  );
  const retailNavStockAlerts = useMemo(
    () =>
      navInventory
        .filter((item) => item.quantity <= 3 && item.condition !== 'Damaged')
        .map((item) => ({
          id: item.id,
          itemName: item.name,
          currentStock: item.quantity,
          threshold: 5,
          severity: item.quantity <= 1 ? 'critical' : 'low',
        })),
    [navInventory],
  );

  // When user logs in and has only RESTAURANT module, switch to it automatically.
  useEffect(() => {
    if (hasRestaurantModule && currentView.startsWith('restaurant-')) {
      setActiveModule('RESTAURANT');
    } else if (hasRestaurantModule && !hasRetailModule) {
      setActiveModule('RESTAURANT');
    } else {
      setActiveModule('RETAIL');
    }
  }, [currentView, hasRestaurantModule, hasRetailModule]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    const module = currentView.startsWith('restaurant-') && hasRestaurantModule
      ? 'RESTAURANT'
      : resolvedActiveModule;
    if (!canAccessView(currentView, currentRole, module)) {
      navigateToView(defaultViewFor(currentRole, module), true);
    }
  }, [currentRole, currentUser, currentView, hasRestaurantModule, isLoggedIn, navigateToView, resolvedActiveModule]);

  // Global handler to remove leading zeros from number inputs.
  useEffect(() => {
    const handleNumberInput = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.type === 'number' && input.value && input.value !== '0') {
        const cleaned = input.value.replace(/^0+/, '') || '0';
        if (cleaned !== input.value) {
          input.value = cleaned;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    };

    document.addEventListener('blur', handleNumberInput, true);
    return () => document.removeEventListener('blur', handleNumberInput, true);
  }, []);

  const switchModule = (module: 'RETAIL' | 'RESTAURANT') => {
    setActiveModule(module);
    navigateToView(defaultViewFor(currentRole, module));
  };

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
  };

  const handleLogout = async () => {
    await logout();
    navigateToView('dashboard');
    setActiveModule('RETAIL');
  };

  if (isRestoringSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (resolvedActiveModule === 'RESTAURANT' && hasRestaurantModule) {
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
        case 'restaurant-product-management':
          return <RestaurantProductManagement />;
        case 'restaurant-purchase-orders':
          return <RestaurantPurchaseOrders />;
        case 'restaurant-goods-received':
          return <RestaurantGoodsReceived />;
        case 'restaurant-pos-dashboard':
          return <RestaurantPOSDashboardView onNavigate={(view) => navigateToView(view)} />;
        case 'restaurant-pos-settings':
          return <RestaurantPOSSettingsView />;
        case 'restaurant-staff-accounts':
          return <POSStaffAccountsView module="RESTAURANT" currentUser={currentUser} />;
        case 'restaurant-store-information':
          return <POSAdminManagementView module="RESTAURANT" page="store-information" />;
        case 'restaurant-store-settings':
          return <POSAdminManagementView module="RESTAURANT" page="store-settings" />;
        case 'restaurant-pos-categories':
          return <POSAdminManagementView module="RESTAURANT" page="categories" />;
        case 'restaurant-pos-products':
          return <POSAdminManagementView module="RESTAURANT" page="products" />;
        case 'restaurant-pos-ingredients':
          return <POSAdminManagementView module="RESTAURANT" page="ingredients" />;
        case 'restaurant-pos-history':
        case 'restaurant-order-list':
          return <RestaurantOrderListView />;
        case 'restaurant-payment':
          return <RestaurantPaymentView />;
        case 'restaurant-receipt':
          return <RestaurantReceiptView />;
        case 'restaurant-table-management':
          return <RestaurantTableManagementView />;
        case 'restaurant-create-order':
          return <RestaurantCreateOrderView />;
        case 'restaurant-pos':
          return <RestaurantPOSView />;
        case 'restaurant-kitchen-orders':
        case 'restaurant-kitchen-queue':
          return <RestaurantKitchenQueueView />;
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
        <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading...</div>}>
          {restaurantContent}
        </Suspense>
      </RestaurantLayout>
    );
  }

  const retailContent = (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading...</div>}>
      {currentView === 'dashboard' && (
        <DashboardView />
      )}
      {currentView === 'stock-alerts' && (
        <StockAlertsView />
      )}
      {currentView === 'inventory' && (
        <InventoryView />
      )}
      {currentView === 'product-management' && <ProductManagementView currentUser={currentUser} />}
      {currentView === 'pos-dashboard' && <RetailPOSDashboardView onNavigate={(view) => navigateToView(view)} />}
      {currentView === 'pos-settings' && <RetailPOSSettingsView />}
      {currentView === 'pos-staff-accounts' && <POSStaffAccountsView module="RETAIL" currentUser={currentUser} />}
      {currentView === 'pos' && <POSView currentUser={currentUser} />}
      {currentView === 'retail-create-order' && <RetailCreateOrderView currentUser={currentUser} />}
      {currentView === 'retail-order-list' && <RetailOrderListView />}
      {currentView === 'sales-history' && <RetailOrderListView />}
      {currentView === 'retail-thermal-receipt' && <RetailReceiptView />}
      {currentView === 'purchase-orders' && <PurchaseOrdersView currentUser={currentUser} />}
      {currentView === 'products-received' && <ProductsReceivedView currentUser={currentUser} />}
      {currentView === 'item-bundling' && <ItemBundlingView currentUser={currentUser} />}
      {currentView === 'transfers' && <TransfersView currentUser={currentUser} />}
      {currentView === 'multilocation' && <MultilocationView />}
      {currentView === 'reports' && (
        <ReportsView />
      )}
      {currentView === 'user-management' && (
        <UserManagementView
          currentUser={currentUser}
        />
      )}
    </Suspense>
  );

  if (isRetailPOSWorkspace) {
    return (
      <POSShell
        module="RETAIL"
        currentView={currentView}
        user={currentUser}
        onNavigate={(view) => navigateToView(view as ViewType)}
        onLogout={handleLogout}
      >
        {retailContent}
      </POSShell>
    );
  }

  return (
    <div className="bg-[#F8FAFB] h-screen w-screen overflow-hidden flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="h-full w-[256px] flex flex-col" style={{ background: '#003534' }}>
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

        {hasBothModules && (
          <div className="px-4 pb-3 flex gap-2">
            <button
              onClick={() => switchModule('RETAIL')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${resolvedActiveModule === 'RETAIL' ? 'bg-[#007A5E] text-white' : 'bg-[rgba(255,255,255,0.08)] text-[#a0c4bf] hover:bg-[rgba(255,255,255,0.14)]'}`}
            >
              <Store className="size-3.5" />
              Retail
            </button>
            <button
              onClick={() => switchModule('RESTAURANT')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${resolvedActiveModule === 'RESTAURANT' ? 'bg-[#007A5E] text-white' : 'bg-[rgba(255,255,255,0.08)] text-[#a0c4bf] hover:bg-[rgba(255,255,255,0.14)]'}`}
            >
              <UtensilsCrossed className="size-3.5" />
              Restaurant
            </button>
          </div>
        )}

        <nav className="flex-1 px-6 pb-4 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {resolvedActiveModule === 'RETAIL' && (
            <>
              <WorkspaceSwitchButton
                isPOSWorkspace={isRetailPOSWorkspace}
                onClick={() => navigateToView(isRetailPOSWorkspace ? 'dashboard' : 'pos-dashboard')}
              />

              {isRetailPOSWorkspace ? (
                <>
                  {canAccessView('pos-dashboard', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'pos-dashboard'} onClick={() => navigateToView('pos-dashboard')}>
                      <DashboardIcon />
                      Dashboard
                    </NavButton>
                  )}
                  {canAccessView('retail-create-order', currentRole, 'RETAIL') && (
                    <NavButton active={(retailPOSActiveViews['retail-create-order'] ?? ['retail-create-order']).includes(currentView)} onClick={() => navigateToView('retail-create-order')}>
                      <POSIcon />
                      Create Order
                    </NavButton>
                  )}
                  {canAccessView('retail-order-list', currentRole, 'RETAIL') && (
                    <NavButton active={(retailPOSActiveViews['retail-order-list'] ?? ['retail-order-list']).includes(currentView)} onClick={() => navigateToView('retail-order-list')}>
                      <SalesHistoryIcon />
                      Transactions
                    </NavButton>
                  )}
                  {canAccessView('retail-thermal-receipt', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'retail-thermal-receipt'} onClick={() => navigateToView('retail-thermal-receipt')}>
                      <Receipt className="size-5" />
                      Thermal Receipt
                    </NavButton>
                  )}
                  {canAccessView('reports', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'reports'} onClick={() => navigateToView('reports')}>
                      <ReportsIcon />
                      Reports
                    </NavButton>
                  )}
                  {canAccessView('pos-settings', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'pos-settings'} onClick={() => navigateToView('pos-settings')}>
                      <Settings2 className="size-5" />
                      POS Settings
                    </NavButton>
                  )}
                </>
              ) : (
                <>
                  {canAccessView('dashboard', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'dashboard'} onClick={() => navigateToView('dashboard')}>
                      <DashboardIcon />
                      Dashboard
                    </NavButton>
                  )}
                  {canAccessView('stock-alerts', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'stock-alerts'} onClick={() => navigateToView('stock-alerts')}>
                      <StockAlertsIcon />
                      Stock Alerts
                      {retailNavStockAlerts.length > 0 && (
                        <span className="ml-auto bg-[#009BA5] text-white text-xs rounded-full px-2 py-0.5">
                          {retailNavStockAlerts.length}
                        </span>
                      )}
                    </NavButton>
                  )}
                  {canAccessView('inventory', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'inventory'} onClick={() => navigateToView('inventory')}>
                      <InventoryIcon />
                      Inventory
                      {retailNavStats.totalItems > 0 && (
                        <span className="ml-auto bg-[rgba(255,255,255,0.2)] text-white text-xs rounded-full px-2 py-0.5">
                          {retailNavStats.totalItems}
                        </span>
                      )}
                    </NavButton>
                  )}
                  {canAccessView('product-management', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'product-management'} onClick={() => navigateToView('product-management')}>
                      <ProductManagementIcon />
                      Product Management
                    </NavButton>
                  )}
                  {canAccessView('purchase-orders', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'purchase-orders'} onClick={() => navigateToView('purchase-orders')}>
                      <PurchaseOrdersIcon />
                      Purchase Orders
                    </NavButton>
                  )}
                  {canAccessView('products-received', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'products-received'} onClick={() => navigateToView('products-received')}>
                      <ProductsReceivedIcon />
                      Products Received
                    </NavButton>
                  )}
                  {canAccessView('item-bundling', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'item-bundling'} onClick={() => navigateToView('item-bundling')}>
                      <ItemBundlingIcon />
                      Item Bundling
                    </NavButton>
                  )}
                  {canAccessView('transfers', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'transfers'} onClick={() => navigateToView('transfers')}>
                      <TransfersIcon />
                      Transfers
                    </NavButton>
                  )}
                  {canAccessView('multilocation', currentRole, 'RETAIL') && (
                    <NavButton active={currentView === 'multilocation'} onClick={() => navigateToView('multilocation')}>
                      <MultilocationIcon />
                      Multilocation
                    </NavButton>
                  )}
                </>
              )}
            </>
          )}

          {currentUser?.role === 'Admin' && !isRetailPOSWorkspace && (
            <NavButton active={currentView === 'user-management'} onClick={() => navigateToView('user-management')}>
              <UserManagementIcon />
              User Management
            </NavButton>
          )}
        </nav>

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

      <div className="flex-1 h-full flex flex-col overflow-hidden">
        <div className="bg-[#005656] border-b border-[rgba(255,255,255,0.1)] px-6 py-4 flex items-center">
          <h1 className="text-white text-[20px] leading-[28px] flex-1" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
            {currentView.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {retailContent}
        </div>
      </div>
    </div>
  );
}

function WorkspaceSwitchButton({
  isPOSWorkspace,
  onClick,
}: {
  isPOSWorkspace: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.08)] px-3 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[rgba(255,255,255,0.14)]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {isPOSWorkspace ? <Package className="size-4" /> : <Store className="size-4" />}
      {isPOSWorkspace ? 'Inventory Workspace' : 'POS Workspace'}
    </button>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
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

const DashboardIcon = () => <LayoutDashboard className="size-5" />;
const StockAlertsIcon = () => <AlertTriangle className="size-5" />;
const InventoryIcon = () => <Package className="size-5" />;
const ProductManagementIcon = () => <Settings2 className="size-5" />;
const POSIcon = () => <Store className="size-5" />;
const PurchaseOrdersIcon = () => <ShoppingCart className="size-5" />;
const ProductsReceivedIcon = () => <PackageCheck className="size-5" />;
const ItemBundlingIcon = () => <Layers className="size-5" />;
const SalesHistoryIcon = () => <Receipt className="size-5" />;
const TransfersIcon = () => <ArrowRightLeft className="size-5" />;
const MultilocationIcon = () => <MapPin className="size-5" />;
const ReportsIcon = () => <FileText className="size-5" />;
const UserManagementIcon = () => <Users className="size-5" />;
const LogoutIcon = () => <LogOut className="size-4" />;
