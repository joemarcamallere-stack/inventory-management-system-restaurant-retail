import { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, AlertTriangle, Package, PackagePlus, ShoppingCart, PackageCheck, Layers, ArrowRightLeft, MapPin, FileText, Users, LogOut, ChefHat, ClipboardList, Store, UtensilsCrossed } from 'lucide-react';
import LoginPage from './components/LoginPage';
import TransfersView from '../modules/retail/TransfersView';
import MultilocationView from '../modules/retail/MultilocationView';
import PurchaseOrdersView from '../modules/retail/PurchaseOrdersView';
import POSView from '../modules/retail/POSView';
import { DashboardView, StockAlertsView, InventoryView, ProductsReceivedView, ItemBundlingView, ReportsView, UserManagementView } from '../modules/retail/RetailViews';
import RestaurantShell from '../modules/restaurant/RestaurantShell';
import {
  clearStoredToken,
  createInventoryItem,
  deleteInventoryItem,
  getInventory,
  getLocations,
  getUsers,
  loginUser,
  storeToken,
  updateInventoryItem,
} from './api/client';

// Import types and sample data generation
import type {
  InventoryItem,
  PurchaseOrder,
  ProductReceived,
  Transfer,
  Adjustment,
  Location,
  User,
  Supplier,
} from './utils/generateSampleData';

import {
  generateSampleData,
  generatePurchaseOrders,
  generateProductsReceived,
  generateTransfers,
  generateAdjustments,
  generateLocations,
  generateUsers,
} from './utils/generateSampleData';


// Types
interface StockAlert {
  id: string;
  itemName: string;
  currentStock: number;
  threshold: number;
  severity: 'low' | 'critical';
}

type ApiLocation = Location & { _count?: { items: number } };
type ApiInventoryItem = Omit<InventoryItem, 'dateAdded' | 'location' | 'targetCustomer' | 'subcategory' | 'size' | 'condition'> & {
  dateAdded: string;
  locationId: string;
  location?: ApiLocation;
  itemType?: string;
  sku?: string | null;
  targetCustomer?: InventoryItem['targetCustomer'] | null;
  subcategory?: string | null;
  size?: string | null;
  condition?: InventoryItem['condition'] | null;
  unit?: string | null;
  minStock?: number | null;
  maxStock?: number | null;
  reorderPoint?: number | null;
  expiryDate?: string | null;
  storageTemperature?: string | null;
};

const formatDate = (value: string) => value ? new Date(value).toISOString().split('T')[0] : '';

const mapApiLocation = (location: ApiLocation): Location => ({
  id: location.id,
  name: location.name,
  address: location.address,
  manager: location.manager,
  phone: location.phone,
  itemCount: location.itemCount ?? location._count?.items ?? 0
});

const mapApiInventoryItem = (item: ApiInventoryItem): InventoryItem & { locationId?: string } => ({
  id: item.id,
  name: item.name,
  category: item.category,
  targetCustomer: item.targetCustomer ?? 'Unisex',
  subcategory: item.subcategory ?? 'General',
  size: item.size ?? 'N/A',
  condition: item.condition ?? 'Good',
  quantity: item.quantity,
  price: item.price,
  dateAdded: formatDate(item.dateAdded),
  location: item.location?.name ?? 'Unknown Location',
  locationId: item.locationId
});

const mapApiUser = (user: any): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  lastLogin: formatDate(user.lastLogin)
});


type ViewType = 'dashboard' | 'stock-alerts' | 'inventory' | 'pos' | 'purchase-orders' | 'products-received' | 'item-bundling' | 'transfers' | 'multilocation' | 'reports' | 'user-management' | 'restaurant-ingredients' | 'restaurant-menu-items' | 'restaurant-recipes' | 'restaurant-kitchen-orders' | 'restaurant-spoilage' | 'restaurant-dashboard' | 'restaurant-stock-control' | 'restaurant-food-inventory' | 'restaurant-add-food-item' | 'restaurant-purchase-orders' | 'restaurant-goods-received' | 'restaurant-pos' | 'restaurant-recipe-bom' | 'restaurant-transfers' | 'restaurant-reports' | 'restaurant-multilocation';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; email: string; role: string; businessId?: string; modules?: string[] } | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [inventory, setInventory] = useState<InventoryItem[]>(generateSampleData());
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(generatePurchaseOrders());
  const [productsReceived, setProductsReceived] = useState<ProductReceived[]>(generateProductsReceived());
  const [transfers, setTransfers] = useState<Transfer[]>(generateTransfers());
  const [adjustments, setAdjustments] = useState<Adjustment[]>(generateAdjustments());
  const [locations, setLocations] = useState<Location[]>(generateLocations());
  const [users, setUsers] = useState<User[]>(generateUsers());
  const hasRestaurantModule = currentUser?.modules?.includes('RESTAURANT') ?? false;
  const hasUkayModule = currentUser?.modules?.includes('UKAY') ?? false;
  const hasBothModules = hasRestaurantModule && hasUkayModule;
  const [activeModule, setActiveModule] = useState<'UKAY' | 'RESTAURANT'>('UKAY');

  // When user logs in and has only RESTAURANT module, switch to it automatically
  useEffect(() => {
    if (hasRestaurantModule && !hasUkayModule) {
      setActiveModule('RESTAURANT');
    } else {
      setActiveModule('UKAY');
    }
  }, [hasRestaurantModule, hasUkayModule]);

  // When switching modules, navigate to the appropriate default view
  const switchModule = (module: 'UKAY' | 'RESTAURANT') => {
    setActiveModule(module);
    setCurrentView(module === 'RESTAURANT' ? 'restaurant-dashboard' : 'dashboard');
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

  useEffect(() => {
    if (!isLoggedIn) return;

    const loadPhaseOneData = async () => {
      try {
        const [inventoryData, locationData] = await Promise.all([
          getInventory({ itemType: 'UKAY_ITEM' }),
          getLocations()
        ]);

        setInventory(inventoryData.map(mapApiInventoryItem));
        setLocations(locationData.map(mapApiLocation));

        if (currentUser?.role === 'Admin') {
          const userData = await getUsers();
          setUsers(userData.map(mapApiUser));
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to load backend data');
      }
    };

    loadPhaseOneData();
  }, [isLoggedIn, currentUser?.role]);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    targetCustomer: 'Unisex' as 'Male' | 'Female' | 'Unisex',
    subcategory: '',
    size: '',
    condition: 'Good' as 'Excellent' | 'Good' | 'Fair' | 'Damaged',
    quantity: 1,
    price: 0,
    location: 'Main Store'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  // Calculate statistics
  const stats = useMemo(() => {
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const availableStock = inventory.filter(item => item.condition !== 'Damaged').reduce((sum, item) => sum + item.quantity, 0);
    const damagedItems = inventory.filter(item => item.condition === 'Damaged').reduce((sum, item) => sum + item.quantity, 0);
    const stockMovements = inventory.length;

    const lastMonthItems = 15; // Mock data
    const itemsChange = ((totalItems - lastMonthItems) / lastMonthItems * 100).toFixed(1);

    const lastMonthAvailable = 12;
    const availableChange = ((availableStock - lastMonthAvailable) / lastMonthAvailable * 100).toFixed(1);

    return {
      totalItems,
      availableStock,
      damagedItems,
      stockMovements,
      itemsChange: parseFloat(itemsChange),
      availableChange: parseFloat(availableChange)
    };
  }, [inventory]);

  const stockAlerts = useMemo(() => {
    return inventory
      .filter(item => item.quantity <= 3 && item.condition !== 'Damaged')
      .map(item => ({
        id: item.id,
        itemName: item.name,
        currentStock: item.quantity,
        threshold: 5,
        severity: (item.quantity <= 1 ? 'critical' : 'low') as 'low' | 'critical'
      }));
  }, [inventory]);

  const getLocationIdByName = (name: string) => {
    return locations.find(location => location.name === name)?.id;
  };

  const toInventoryPayload = () => {
    const locationId = getLocationIdByName(formData.location);
    if (!locationId) {
      throw new Error('Please select a valid location');
    }

    return {
      name: formData.name,
      category: formData.category,
      targetCustomer: formData.targetCustomer,
      subcategory: formData.subcategory,
      size: formData.size,
      condition: formData.condition,
      quantity: Number(formData.quantity),
      price: Number(formData.price),
      locationId
    };
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.size) return;

    try {
      if (editingId) {
        const updatedItem = await updateInventoryItem(editingId, toInventoryPayload());
        setInventory(inventory.map(item =>
          item.id === editingId ? mapApiInventoryItem(updatedItem) : item
        ));
        setEditingId(null);
      } else {
        const newItem = await createInventoryItem(toInventoryPayload());
        setInventory([...inventory, mapApiInventoryItem(newItem)]);
      }

      setFormData({
        name: '',
        category: '',
        targetCustomer: 'Unisex',
        subcategory: '',
        size: '',
        condition: 'Good',
        quantity: 1,
        price: 0,
        location: 'Main Store'
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save inventory item');
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      name: item.name,
      category: item.category,
      targetCustomer: item.targetCustomer,
      subcategory: item.subcategory,
      size: item.size,
      condition: item.condition,
      quantity: item.quantity,
      price: item.price,
      location: item.location
    });
    setEditingId(item.id);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    if (!formData.name || !formData.category || !formData.size) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const updatedItem = await updateInventoryItem(editingId, toInventoryPayload());
      setInventory(inventory.map(item =>
        item.id === editingId ? mapApiInventoryItem(updatedItem) : item
      ));

      setEditingId(null);
      setShowEditModal(false);
      setFormData({
        name: '',
        category: '',
        targetCustomer: 'Unisex',
        subcategory: '',
        size: '',
        condition: 'Good',
        quantity: 1,
        price: 0,
        location: 'Main Store'
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update inventory item');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setShowEditModal(false);
    setFormData({
      name: '',
      category: '',
      targetCustomer: 'Unisex',
      subcategory: '',
      size: '',
      condition: 'Good',
      quantity: 1,
      price: 0,
      location: 'Main Store'
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteInventoryItem(id);
        setInventory(inventory.filter(item => item.id !== id));
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete inventory item');
      }
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subcategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSubcategory = (key: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubcategories(newExpanded);
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await loginUser(email, password);
      storeToken(response.accessToken);
      setCurrentUser({
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
        businessId: response.user.businessId,
        modules: response.user.modules
      });
      setIsLoggedIn(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Invalid credentials');
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (activeModule === 'RESTAURANT' && hasRestaurantModule) {
    return (
      <RestaurantShell
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        hasBothModules={hasBothModules}
        onSwitchToUkay={() => switchModule('UKAY')}
        onLogout={handleLogout}
        users={users}
        setUsers={setUsers}
      />
    );
  }

  return (
    <div className="bg-[#F8FAFB] h-screen w-screen overflow-hidden flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <div className="h-full w-[256px] flex flex-col" style={{ background: "#003534" }}>
        {/* Header */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-white rounded-full size-[40px] flex items-center justify-center shadow-sm">
            <Package className="size-6 text-[#007A5E]" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-white text-[20px] leading-[28px]" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
              Inventra
            </p>
            <p className="text-[#00A7A5] text-[12px] leading-[16px]" style={{ fontFamily: 'Inter, sans-serif' }}>Inventory System</p>
          </div>
        </div>

        {/* Module switch â€” only shown when business has BOTH modules */}
        {hasBothModules && (
          <div className="px-4 pb-3 flex gap-2">
            <button
              onClick={() => switchModule('UKAY')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${activeModule === 'UKAY' ? 'bg-[#007A5E] text-white' : 'bg-[rgba(255,255,255,0.08)] text-[#a0c4bf] hover:bg-[rgba(255,255,255,0.14)]'}`}
            >
              <Store className="size-3.5" />
              Ukay-Ukay
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
          {/* Ukay-Ukay nav â€” shown when activeModule is UKAY or business has only UKAY */}
          {activeModule === 'UKAY' && (
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

          {/* Restaurant nav â€” shown when activeModule is RESTAURANT */}
          {activeModule === 'RESTAURANT' && hasRestaurantModule && (
            <>
              <NavButton active={currentView === 'restaurant-dashboard'} onClick={() => setCurrentView('restaurant-dashboard')}>
                <DashboardIcon />
                Dashboard
              </NavButton>
              <NavButton active={currentView === 'restaurant-stock-control'} onClick={() => setCurrentView('restaurant-stock-control')}>
                <StockAlertsIcon />
                Stock Control
              </NavButton>
              <NavButton active={currentView === 'restaurant-food-inventory'} onClick={() => setCurrentView('restaurant-food-inventory')}>
                <InventoryIcon />
                Food Inventory
              </NavButton>
              <NavButton active={currentView === 'restaurant-add-food-item'} onClick={() => setCurrentView('restaurant-add-food-item')}>
                <PackagePlusIcon />
                Add Food Item
              </NavButton>
              <NavButton active={currentView === 'restaurant-purchase-orders'} onClick={() => setCurrentView('restaurant-purchase-orders')}>
                <PurchaseOrdersIcon />
                Purchase Orders
              </NavButton>
              <NavButton active={currentView === 'restaurant-goods-received'} onClick={() => setCurrentView('restaurant-goods-received')}>
                <ProductsReceivedIcon />
                Goods Received
              </NavButton>
              <NavButton active={currentView === 'restaurant-pos'} onClick={() => setCurrentView('restaurant-pos')}>
                <RestaurantKitchenIcon />
                POS / Kitchen Orders
              </NavButton>
              <NavButton active={currentView === 'restaurant-recipe-bom'} onClick={() => setCurrentView('restaurant-recipe-bom')}>
                <RestaurantRecipesIcon />
                Recipe &amp; BOM
              </NavButton>
              <NavButton active={currentView === 'restaurant-transfers'} onClick={() => setCurrentView('restaurant-transfers')}>
                <TransfersIcon />
                Transfers &amp; Adjustments
              </NavButton>
              <NavButton active={currentView === 'restaurant-multilocation'} onClick={() => setCurrentView('restaurant-multilocation')}>
                <MultilocationIcon />
                Multi-Location
              </NavButton>
              <NavButton active={currentView === 'restaurant-reports'} onClick={() => setCurrentView('restaurant-reports')}>
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
              setLocations={setLocations}
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
              users={users}
              setUsers={setUsers}
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
const PackagePlusIcon = () => <PackagePlus className="size-5" />;
const PurchaseOrdersIcon = () => <ShoppingCart className="size-5" />;
const ProductsReceivedIcon = () => <PackageCheck className="size-5" />;
const ItemBundlingIcon = () => <Layers className="size-5" />;
const TransfersIcon = () => <ArrowRightLeft className="size-5" />;
const MultilocationIcon = () => <MapPin className="size-5" />;
const ReportsIcon = () => <FileText className="size-5" />;
const UserManagementIcon = () => <Users className="size-5" />;
const RestaurantRecipesIcon = () => <ChefHat className="size-5" />;
const RestaurantKitchenIcon = () => <ClipboardList className="size-5" />;
const LogoutIcon = () => <LogOut className="size-4" />;

