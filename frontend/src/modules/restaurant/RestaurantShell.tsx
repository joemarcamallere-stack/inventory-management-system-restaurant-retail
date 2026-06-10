import type { Dispatch, SetStateAction } from 'react';
import {
  LayoutDashboard,
  Apple,
  FileText,
  ShoppingCart,
  ClipboardCheck,
  Users,
  PlusCircle,
  LogOut,
  Package,
  ChefHat,
  ArrowLeftRight,
  MapPin,
  Shield,
  User,
  ReceiptText,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { Dashboard } from './Dashboard';
import { StockControl } from './StockControl';
import { Inventory } from './Inventory';
import { AddProduct } from './AddProduct';
import { PurchaseOrders } from './PurchaseOrders';
import { GoodsReceived } from './GoodsReceived';
import { POSKitchenOrders } from './POSKitchenOrders';
import { RecipeBOM } from './RecipeBOM';
import { Transfers } from './Transfers';
import { Reports } from './Reports';
import { MultiLocation } from './MultiLocation';
import { UserManagementView } from '../retail/RetailViews';
import type { User as AppUser } from '../../app/utils/generateSampleData';
import LegacyRestaurantDataBridge from './LegacyRestaurantDataBridge';
import './restaurantLegacyTheme.css';

type RestaurantView =
  | 'restaurant-dashboard'
  | 'restaurant-stock-control'
  | 'restaurant-food-inventory'
  | 'restaurant-add-food-item'
  | 'restaurant-purchase-orders'
  | 'restaurant-goods-received'
  | 'restaurant-pos'
  | 'restaurant-recipe-bom'
  | 'restaurant-transfers'
  | 'restaurant-multilocation'
  | 'restaurant-reports'
  | 'user-management'
  | string;

type CurrentUser = {
  id?: string;
  name?: string;
  email: string;
  role: string;
  businessId?: string;
  modules?: string[];
} | null;

type Props = {
  currentView: RestaurantView;
  setCurrentView: Dispatch<SetStateAction<any>>;
  currentUser: CurrentUser;
  hasBothModules: boolean;
  onSwitchToRetail: () => void;
  onLogout: () => void;
  users: AppUser[];
  setUsers: Dispatch<SetStateAction<AppUser[]>>;
};

const restaurantNavItems = [
  { view: 'restaurant-dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-stock-control', icon: Package, label: 'Stock Control & Alerts', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-food-inventory', icon: Apple, label: 'Food Inventory', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-add-food-item', icon: PlusCircle, label: 'Add Food Item', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-purchase-orders', icon: ShoppingCart, label: 'Purchase Orders', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-goods-received', icon: ClipboardCheck, label: 'Goods Received', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-pos', icon: ReceiptText, label: 'POS / Kitchen Orders', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-recipe-bom', icon: ChefHat, label: 'Recipe & BOM', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-transfers', icon: ArrowLeftRight, label: 'Transfers & Adjustments', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-multilocation', icon: MapPin, label: 'Multi-Location', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'restaurant-reports', icon: FileText, label: 'Reports', roles: ['Admin', 'Manager', 'Staff'] },
  { view: 'user-management', icon: Users, label: 'User Management', roles: ['Admin'] },
] as const;

export default function RestaurantShell({
  currentView,
  setCurrentView,
  currentUser,
  hasBothModules,
  onSwitchToRetail,
  onLogout,
  users,
  setUsers,
}: Props) {
  const userRole = currentUser?.role ?? 'Staff';
  const navItems = restaurantNavItems.filter((item) => item.roles.includes(userRole as any));

  const renderContent = () => {
    switch (currentView) {
      case 'restaurant-dashboard':
      case 'restaurant-ingredients':
        return <Dashboard />;
      case 'restaurant-stock-control':
      case 'restaurant-spoilage':
        return <StockControl />;
      case 'restaurant-food-inventory':
      case 'restaurant-menu-items':
        return <Inventory />;
      case 'restaurant-add-food-item':
        return <AddProduct />;
      case 'restaurant-purchase-orders':
        return <PurchaseOrders />;
      case 'restaurant-goods-received':
        return <GoodsReceived />;
      case 'restaurant-pos':
      case 'restaurant-kitchen-orders':
        return <POSKitchenOrders />;
      case 'restaurant-recipe-bom':
      case 'restaurant-recipes':
        return <RecipeBOM />;
      case 'restaurant-transfers':
        return <Transfers />;
      case 'restaurant-multilocation':
        return <MultiLocation />;
      case 'restaurant-reports':
        return <Reports />;
      case 'user-management':
        return <UserManagementView users={users} setUsers={setUsers} currentUser={currentUser} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="restaurant-legacy flex h-screen bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white shadow-lg flex-shrink-0 flex items-center justify-center">
              <UtensilsCrossed className="w-7 h-7 text-primary" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#F8FAFB' }}>Cocoders</h1>
              <p className="text-xs text-sidebar-foreground/70">Restaurant</p>
            </div>
          </div>
        </div>

        {hasBothModules && (
          <div className="px-4 pt-4">
            <button
              type="button"
              onClick={onSwitchToRetail}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
            >
              <Store className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Retail</span>
            </button>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;

            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setCurrentView(item.view)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-3 bg-sidebar-accent rounded-xl mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm"
              style={{
                background:
                  userRole === 'Admin'
                    ? 'linear-gradient(to bottom right, #009BA5, #00A7A5)'
                    : 'linear-gradient(to bottom right, #007A5E, #008967)',
              }}
            >
              {userRole === 'Admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {userRole === 'Admin' ? 'Admin User' : 'Staff User'}
                </p>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: userRole === 'Admin' ? '#E0F7F7' : '#D1F2E8',
                    color: userRole === 'Admin' ? '#005656' : '#007A5E',
                  }}
                >
                  {userRole}
                </span>
              </div>
              <p className="text-xs text-sidebar-foreground/70 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <MemoryRouter>
          <LegacyRestaurantDataBridge currentUser={currentUser}>
            {renderContent()}
          </LegacyRestaurantDataBridge>
        </MemoryRouter>
      </main>
    </div>
  );
}
