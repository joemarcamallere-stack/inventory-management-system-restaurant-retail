import { useEffect, useState, type ReactNode } from "react";
import {
  Apple,
  ArrowLeftRight,
  ChefHat,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  PackageSearch,
  ReceiptText,
  Shield,
  ShoppingCart,
  Store,
  User as UserIcon,
  Users,
} from "lucide-react";
import logoImage from "../../imports/ims-logo.png";
import "./restaurantLegacyTheme.css";
import { POSShell } from "../shared/pos/shell/POSShell";

const navItems = [
  { view: "restaurant-dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["Admin", "Manager", "Staff"] },
  { view: "restaurant-stock-control", icon: Package, label: "Stock Control & Alerts", roles: ["Admin", "Manager", "Staff"] },
  { view: "restaurant-food-inventory", icon: Apple, label: "Food Inventory", roles: ["Admin", "Manager", "Staff"] },
  { view: "restaurant-purchase-orders", icon: ShoppingCart, label: "Purchase Orders", roles: ["Admin", "Manager", "Staff"] },
  { view: "restaurant-goods-received", icon: ClipboardCheck, label: "Goods Received", roles: ["Admin", "Manager", "Staff"] },
  { view: "restaurant-pos-dashboard", icon: LayoutDashboard, label: "POS Dashboard", roles: ["Admin", "Manager", "Staff", "Cashier", "KitchenStaff"] },
  { view: "restaurant-create-order", icon: ReceiptText, label: "Create Order", roles: ["Admin", "Manager", "Staff", "Cashier"] },
  { view: "restaurant-payment", icon: ReceiptText, label: "Payment", roles: ["Admin", "Manager", "Staff", "Cashier"] },
  { view: "restaurant-receipt", icon: ReceiptText, label: "Receipt", roles: ["Admin", "Manager", "Staff", "Cashier"] },
  { view: "restaurant-order-list", icon: ReceiptText, label: "Order List", roles: ["Admin", "Manager", "Staff", "Cashier"] },
  { view: "restaurant-table-management", icon: LayoutDashboard, label: "Table Management", roles: ["Admin", "Manager", "Staff"] },
  { view: "restaurant-kitchen-queue", icon: ChefHat, label: "Kitchen Queue", roles: ["Admin", "Manager", "Staff", "KitchenStaff"] },
  { view: "restaurant-pos-settings", icon: PackageSearch, label: "POS Settings", roles: ["Admin", "Manager"] },
  { view: "restaurant-recipe-bom", icon: ChefHat, label: "Recipe & BOM", roles: ["Admin", "Manager", "Staff", "KitchenStaff"] },
  { view: "restaurant-transfers", icon: ArrowLeftRight, label: "Transfers & Adjustments", roles: ["Admin", "Manager", "Staff"] },
  { view: "restaurant-multilocation", icon: MapPin, label: "Multi-Location", roles: ["Admin", "Manager", "Staff"] },
  { view: "restaurant-reports", icon: FileText, label: "Reports", roles: ["Admin", "Manager", "Staff"] },
  { view: "restaurant-product-management", icon: PackageSearch, label: "Product Management", roles: ["Admin"] },
  { view: "user-management", icon: Users, label: "User Management", roles: ["Admin"] },
] as const;

const restaurantPOSViews = new Set([
  "restaurant-pos-dashboard",
  "restaurant-staff-accounts",
  "restaurant-create-order",
  "restaurant-payment",
  "restaurant-receipt",
  "restaurant-order-list",
  "restaurant-table-management",
  "restaurant-kitchen-queue",
  "restaurant-pos-settings",
  "restaurant-store-information",
  "restaurant-store-settings",
  "restaurant-pos-categories",
  "restaurant-pos-products",
  "restaurant-pos-ingredients",
  "restaurant-reports",
]);

const restaurantPOSNavItems = [
  { view: "restaurant-pos-dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["Admin", "Manager", "Staff", "Cashier", "KitchenStaff"], activeViews: ["restaurant-pos-dashboard"] },
  { view: "restaurant-create-order", icon: ReceiptText, label: "Create Order", roles: ["Admin", "Manager", "Staff", "Cashier"], activeViews: ["restaurant-create-order", "restaurant-payment", "restaurant-receipt"] },
  { view: "restaurant-order-list", icon: ReceiptText, label: "Transaction", roles: ["Admin", "Manager", "Staff", "Cashier"], activeViews: ["restaurant-order-list"] },
  { view: "restaurant-table-management", icon: LayoutDashboard, label: "Tables", roles: ["Admin", "Manager", "Staff"], activeViews: ["restaurant-table-management"] },
  { view: "restaurant-kitchen-queue", icon: ChefHat, label: "Kitchen", roles: ["Admin", "Manager", "Staff", "KitchenStaff"], activeViews: ["restaurant-kitchen-queue"] },
  { view: "restaurant-reports", icon: FileText, label: "Reports", roles: ["Admin", "Manager", "Staff"], activeViews: ["restaurant-reports"] },
  { view: "restaurant-pos-settings", icon: PackageSearch, label: "POS Settings", roles: ["Admin", "Manager"], activeViews: ["restaurant-pos-settings"] },
] as const;

const restaurantIMSNavItems = navItems.filter((item) => !restaurantPOSViews.has(item.view));

type Props = {
  currentView: string;
  user: { email: string; role: string } | null;
  hasBothModules: boolean;
  onNavigate: (view: string) => void;
  onSwitchToRetail: () => void;
  onLogout: () => void;
  children: ReactNode;
};

export function RestaurantLayout({
  currentView,
  user,
  hasBothModules,
  onNavigate,
  onSwitchToRetail,
  onLogout,
  children,
}: Props) {
  const userRole = user?.role ?? "Staff";
  const isPOSWorkspace = restaurantPOSViews.has(currentView);
  const visibleItems = (isPOSWorkspace ? restaurantPOSNavItems : restaurantIMSNavItems)
    .filter((item) => item.roles.includes(userRole as any));
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setDataError(detail?.message || "A restaurant data request failed.");
    };
    window.addEventListener("restaurant-sync-error", handleError);
    window.addEventListener("api-error", handleError);
    return () => {
      window.removeEventListener("restaurant-sync-error", handleError);
      window.removeEventListener("api-error", handleError);
    };
  }, []);

  if (isPOSWorkspace) {
    return (
      <POSShell
        module="RESTAURANT"
        currentView={currentView}
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        {children}
      </POSShell>
    );
  }

  return (
    <div className="restaurant-legacy flex h-screen bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white shadow-lg flex-shrink-0 overflow-hidden">
              <img src={logoImage} alt="Bukolabs.io Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#F8FAFB" }}>Bukolabs.io</h1>
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

        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => onNavigate(isPOSWorkspace ? "restaurant-dashboard" : "restaurant-pos-dashboard")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {isPOSWorkspace ? <Package className="w-4 h-4" /> : <Store className="w-4 h-4" />}
            {isPOSWorkspace ? "Inventory Workspace" : "POS Workspace"}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const activeViews = "activeViews" in item ? item.activeViews : [item.view];
            const isActive = activeViews.includes(currentView as never);
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-left leading-snug">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-3 bg-sidebar-accent rounded-xl mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm"
              style={{
                background: userRole === "Admin"
                  ? "linear-gradient(to bottom right, #009BA5, #00A7A5)"
                  : "linear-gradient(to bottom right, #007A5E, #008967)",
              }}
            >
              {userRole === "Admin" ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-1">
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: userRole === "Admin" ? "#E0F7F7" : "#D1F2E8",
                    color: userRole === "Admin" ? "#005656" : "#007A5E",
                  }}
                >
                  {userRole}
                </span>
              </div>
              <p className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</p>
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
        {dataError && (
          <div className="flex items-center justify-between gap-4 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <span>{dataError}</span>
            <button type="button" className="font-medium underline" onClick={() => setDataError("")}>
              Dismiss
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
