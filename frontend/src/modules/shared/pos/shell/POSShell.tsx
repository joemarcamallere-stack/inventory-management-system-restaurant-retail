import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Archive,
  BarChart3,
  ChevronDown,
  Home,
  Info,
  List,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tags,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
import { useBusinessSettingsQuery } from '../../../lib/domainQueries';
import bukolabsRestaurantLogo from '../../../../imports/bukolabs-res.png';
import bukolabsRetailLogo from '../../../../imports/bukolabs-ret.png';
import { getBusinessProfile } from '../settings/posSettings';

type POSModule = 'RESTAURANT' | 'RETAIL';

type NavItem = {
  icon: typeof Home;
  label: string;
  view?: string;
  children?: Array<{
    icon: typeof Home;
    label: string;
    view: string;
  }>;
};

type Props = {
  module: POSModule;
  currentView: string;
  user: { email: string; role: string; name?: string | null } | null;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  children: ReactNode;
};

const collapsedStorageKey = 'bukolabs-pos-sidebar-collapsed';
const bukolabsPOSTheme = {
  '--font-heading': "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--font-body': "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--background': '#f8fafc',
  '--foreground': '#0f172a',
  '--card': '#ffffff',
  '--card-foreground': '#0f172a',
  '--primary': '#008967',
  '--primary-foreground': '#ffffff',
  '--secondary': '#64748b',
  '--secondary-foreground': '#ffffff',
  '--muted': '#f1f5f9',
  '--muted-foreground': '#94a3b8',
  '--accent': '#008967',
  '--accent-foreground': '#ffffff',
  '--border': '#e2e8f0',
  '--input-background': '#ffffff',
  '--ring': '#008967',
} as CSSProperties;

const restaurantAdminViews = new Set([
  'restaurant-pos-dashboard',
  'restaurant-staff-accounts',
  'restaurant-order-list',
  'restaurant-reports',
  'restaurant-pos-settings',
  'restaurant-store-information',
  'restaurant-store-settings',
  'restaurant-pos-categories',
  'restaurant-pos-products',
  'restaurant-pos-ingredients',
]);

const retailAdminViews = new Set([
  'pos-dashboard',
  'pos-staff-accounts',
  'retail-order-list',
  'sales-history',
  'reports',
  'pos-settings',
]);

const retailStoreItems = [
  { icon: Info, label: 'Store Information', view: 'pos-settings' },
  { icon: SlidersHorizontal, label: 'Store Settings', view: 'pos-settings' },
];

const restaurantStoreItems = [
  { icon: Info, label: 'Store Information', view: 'restaurant-store-information' },
  { icon: SlidersHorizontal, label: 'Store Settings', view: 'restaurant-store-settings' },
];

const restaurantTemporaryItems = [
  { icon: Tags, label: 'Categories', view: 'restaurant-pos-categories' },
  { icon: Package, label: 'Products', view: 'restaurant-pos-products' },
  { icon: UtensilsCrossed, label: 'Ingredients', view: 'restaurant-pos-ingredients' },
];

const retailTemporaryItems = [
  { icon: Tags, label: 'Categories', view: 'pos-settings' },
  { icon: Package, label: 'Products', view: 'pos-settings' },
];

const storeViews = new Set([
  'restaurant-store-information',
  'restaurant-store-settings',
  'pos-settings',
]);

const temporaryViews = new Set([
  'restaurant-pos-categories',
  'restaurant-pos-products',
  'restaurant-pos-ingredients',
]);

function groupsForView(currentView: string) {
  return {
    Store: storeViews.has(currentView),
    Temporary: temporaryViews.has(currentView),
  };
}

export function POSShell({
  module,
  currentView,
  user,
  onNavigate,
  onLogout,
  children,
}: Props) {
  const isRetail = module === 'RETAIL';
  const isAdminScreen = isRetail
    ? retailAdminViews.has(currentView)
    : restaurantAdminViews.has(currentView);
  const roleLabel = isAdminScreen ? 'Admin' : 'POS Staff';
  const defaultStoreName = isRetail ? 'Retail Store' : 'The Restaurant';
  const { data: businessSettings = [] } = useBusinessSettingsQuery();
  const businessProfile = getBusinessProfile(businessSettings);
  const userStoreName = `${user?.email ?? user?.name ?? defaultStoreName}'s Store`;
  const storeName = businessProfile.displayName && businessProfile.displayName !== 'Bukolabs.io'
    ? businessProfile.displayName
    : userStoreName;
  const defaultLogo = isRetail ? bukolabsRetailLogo : bukolabsRestaurantLogo;
  const storeLogo = businessProfile.logo || defaultLogo;
  const storeItems = isRetail ? retailStoreItems : restaurantStoreItems;
  const temporaryItems = isRetail ? retailTemporaryItems : restaurantTemporaryItems;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(collapsedStorageKey) === 'true';
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Store: groupsForView(currentView).Store,
    Temporary: groupsForView(currentView).Temporary,
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(collapsedStorageKey, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const activeGroup = groupsForView(currentView);
    if (activeGroup.Store || activeGroup.Temporary) {
      setOpenGroups(activeGroup);
    }
  }, [currentView]);

  const adminItems: NavItem[] = isRetail
    ? [
        { icon: Home, label: 'Dashboard', view: 'pos-dashboard' },
        { icon: Users, label: 'Staff Accounts', view: 'pos-staff-accounts' },
        { icon: List, label: 'Transactions', view: 'retail-order-list' },
        { icon: BarChart3, label: 'Reports', view: 'reports' },
      ]
    : [
        { icon: Home, label: 'Dashboard', view: 'restaurant-pos-dashboard' },
        { icon: Users, label: 'Staff Accounts', view: 'restaurant-staff-accounts' },
        { icon: List, label: 'Transaction', view: 'restaurant-order-list' },
        { icon: BarChart3, label: 'Reports', view: 'restaurant-reports' },
      ];

  const staffItems: NavItem[] = isRetail
    ? [
        { icon: Home, label: 'Dashboard', view: 'pos-dashboard' },
        { icon: ShoppingBag, label: 'Create Order', view: 'retail-create-order' },
        { icon: List, label: 'Transactions', view: 'retail-order-list' },
        { icon: BarChart3, label: 'Reports', view: 'reports' },
      ]
    : [
        { icon: Home, label: 'Dashboard', view: 'restaurant-pos-dashboard' },
        { icon: ShoppingCart, label: 'Create Order', view: 'restaurant-create-order' },
        { icon: List, label: 'Transaction', view: 'restaurant-order-list' },
        { icon: UtensilsCrossed, label: 'Tables', view: 'restaurant-table-management' },
        { icon: BarChart3, label: 'Reports', view: 'restaurant-reports' },
      ];

  const managementItems: NavItem[] = isAdminScreen
    ? [
        { icon: Store, label: 'Store', children: storeItems },
        { icon: Archive, label: 'Temporary', children: temporaryItems },
      ]
    : [];

  const visibleItems = isAdminScreen ? adminItems : staffItems;

  const closeManagementGroups = () => {
    setOpenGroups({ Store: false, Temporary: false });
  };

  const navIsActive = (item: NavItem) => {
    if (!item.view) {
      return Boolean(item.children?.some((child) => child.view === currentView));
    }
    if (item.view === 'restaurant-create-order') {
      return ['restaurant-create-order', 'restaurant-payment', 'restaurant-receipt'].includes(currentView);
    }
    if (item.view === 'retail-create-order') {
      return ['retail-create-order', 'pos'].includes(currentView);
    }
    if (item.view === 'retail-order-list') {
      return ['retail-order-list', 'sales-history'].includes(currentView);
    }
    return currentView === item.view;
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({
      Store: label === 'Store' ? !current.Store : false,
      Temporary: label === 'Temporary' ? !current.Temporary : false,
    }));
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = navIsActive(item);
    const isOpen = item.children ? openGroups[item.label] : false;
    return (
      <li key={item.view ?? item.label}>
        <button
          type="button"
          onClick={() => {
            if (item.children) {
              toggleGroup(item.label);
              return;
            }
            closeManagementGroups();
            if (item.view) onNavigate(item.view);
          }}
          className={`flex h-[52px] w-full items-center rounded-lg border transition ${
            isCollapsed ? 'justify-center gap-0 px-0' : 'gap-4 px-4 text-left'
          } ${
            active
              ? 'border-[#00a7a5]/25 text-white'
              : isOpen
                ? 'border-white/15 bg-white/10 text-white'
                : 'border-transparent text-white hover:bg-[#007a5e]/15 hover:text-slate-100'
          }`}
          style={
            active
              ? { background: 'linear-gradient(135deg, #008967 0%, #007a5e 100%)', boxShadow: '0 0 18px rgba(0,167,165,0.16)' }
              : isOpen
                ? { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)' }
                : undefined
          }
        >
          <span className="shrink-0">
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className={`overflow-hidden whitespace-nowrap text-base transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0' : 'flex-1 opacity-100'} ${active ? 'font-semibold' : 'font-medium'}`}>
            {!isCollapsed && item.label}
          </span>
          {item.children && !isCollapsed && (
            <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.8} />
          )}
        </button>
        {item.children && isOpen && (
          <ul className={`space-y-0.5 py-1 transition-all duration-300 ease-in-out ${isCollapsed ? 'pl-0' : 'pl-8'}`}>
            {item.children.map((child) => {
              const ChildIcon = child.icon;
              const childActive = child.view === currentView;
              return (
                <li key={child.view}>
                  <button
                    type="button"
                    onClick={() => {
                      if (child.view) onNavigate(child.view);
                    }}
                    className={`flex h-10 w-full items-center rounded-md transition ${
                      isCollapsed ? 'justify-center gap-0 px-0' : 'gap-4 px-4 text-left'
                    } ${childActive ? 'text-white' : 'text-slate-200 hover:text-white'}`}
                  >
                    <ChildIcon className={`h-4 w-4 shrink-0 ${childActive ? 'text-[#b5fff1]' : 'text-slate-300/70'}`} strokeWidth={1.8} />
                    <span className={`truncate text-sm font-medium transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>
                      {!isCollapsed && child.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-[var(--font-body)]" style={bukolabsPOSTheme}>
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col text-white transition-[width] duration-300 ease-in-out ${isCollapsed ? 'w-20 overflow-visible' : 'w-80 overflow-hidden'}`}
        style={{ background: 'linear-gradient(180deg, #003534 0%, #007a5e 100%)' }}
      >
        <div className={`relative shrink-0 border-b border-white/10 transition-all duration-300 ease-in-out ${isCollapsed ? 'px-3 py-4' : 'px-6 pb-4 pt-5'}`}>
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            className={`z-10 inline-flex items-center justify-center text-slate-300 transition hover:text-slate-100 ${
              isCollapsed ? 'group relative left-1/2 h-10 w-10 -translate-x-1/2' : 'absolute right-3 top-3 h-9 w-9'
            }`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <>
                <img src={storeLogo} alt={storeName} className="h-full w-full object-contain transition-opacity duration-150 group-hover:opacity-0" />
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <PanelLeftOpen className="h-5 w-5" strokeWidth={1.8} />
                </span>
              </>
            ) : (
              <PanelLeftClose className="h-5 w-5" strokeWidth={1.8} />
            )}
          </button>
          <div className="text-center">
            {!isCollapsed && (
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center overflow-hidden bg-transparent transition-all duration-300 ease-in-out">
                <img src={storeLogo} alt={storeName} className="h-full w-full object-contain" />
              </div>
            )}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-16 opacity-100'}`}>
              <h2 className="truncate text-lg font-semibold tracking-tight text-white">{storeName}</h2>
              <p className="mt-0.5 text-sm leading-tight text-slate-200">{roleLabel}</p>
            </div>
          </div>
        </div>

        <nav className={`min-h-0 flex-1 overflow-y-auto py-3 transition-all duration-300 ease-in-out ${isCollapsed ? 'px-3' : 'px-5'}`}>
          <ul className="space-y-0.5">
            {visibleItems.map(renderNavItem)}
          </ul>
          {managementItems.length > 0 && (
            <div className="mt-2">
              <ul className="space-y-0.5">
                {managementItems.map(renderNavItem)}
              </ul>
            </div>
          )}
        </nav>

        <div className={`shrink-0 border-t border-white/10 py-2 text-white transition-all duration-300 ease-in-out ${isCollapsed ? 'px-3' : 'px-5'}`}>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className={`flex h-[52px] w-full items-center rounded-lg border border-transparent text-white transition hover:bg-red-500/10 hover:text-red-200 ${
              isCollapsed ? 'justify-center gap-0 px-0' : 'gap-4 px-4 text-left'
            }`}
          >
            <span className="shrink-0">
              <LogOut className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className={`overflow-hidden whitespace-nowrap text-base font-medium transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0' : 'flex-1 opacity-100'}`}>
              {!isCollapsed && 'Logout'}
            </span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-xl font-semibold text-[#111827]">Confirm Logout</h2>
            <p className="text-sm text-[#64748b]">Are you sure you want to log out?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#f8fafb]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg bg-[#008967] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#007a5e]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
