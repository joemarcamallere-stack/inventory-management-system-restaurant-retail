import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  CalendarClock,
  CheckCircle,
  ChefHat,
  ClipboardList,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Utensils,
  XCircle,
} from 'lucide-react';
import {
  completeKitchenOrder,
  createInventoryItem,
  createRecipe,
  createStockMovement,
  deleteRecipe,
  getInventory,
  getKitchenOrders,
  getLocations,
  getRecipes,
  getStockMovements,
  updateRecipe,
  voidKitchenOrder,
} from '../../app/api/client';
import type {
  RestaurantInventoryItem,
  RestaurantKitchenOrder,
  RestaurantLocation,
  RestaurantRecipe,
  RestaurantStockMovement,
} from './types';

type ItemType = 'INGREDIENT' | 'MENU_ITEM' | 'SUPPLY';
type MovementType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'SPOILAGE' | 'EXPIRY';
type CurrentUser = { id?: string; name?: string; email: string; role: string } | null;

const itemTypes: Record<ItemType, string> = {
  INGREDIENT: 'Ingredient',
  MENU_ITEM: 'Menu Item',
  SUPPLY: 'Supply',
};

const movementTypes: Record<MovementType, string> = {
  STOCK_IN: 'Stock In',
  STOCK_OUT: 'Stock Out',
  ADJUSTMENT: 'Adjustment',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  SPOILAGE: 'Spoilage',
  EXPIRY: 'Expiry',
};

const money = (value?: number | null) =>
  `PHP ${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const dateText = (value?: string | null) => {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const dateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const isExpiringSoon = (item: RestaurantInventoryItem) => {
  if (!item.expiryDate) return false;
  const expiry = new Date(item.expiryDate).getTime();
  if (Number.isNaN(expiry)) return false;
  const days = (expiry - Date.now()) / 86400000;
  return days >= 0 && days <= 7;
};

const isExpired = (item: RestaurantInventoryItem) => {
  if (!item.expiryDate) return false;
  const expiry = new Date(item.expiryDate).getTime();
  return !Number.isNaN(expiry) && expiry < Date.now();
};

const stockStatus = (item: RestaurantInventoryItem) => {
  if (item.quantity <= 0) return { label: 'Out', className: 'bg-red-100 text-red-700 border-red-200' };
  const threshold = item.reorderPoint ?? item.minStock ?? 0;
  if (threshold > 0 && item.quantity <= threshold) {
    return { label: 'Low', className: 'bg-orange-100 text-primary border-[#00A7A5]/30' };
  }
  return { label: 'Healthy', className: 'bg-green-100 text-green-700 border-green-200' };
};

function useRestaurantData() {
  const [ingredients, setIngredients] = useState<RestaurantInventoryItem[]>([]);
  const [menuItems, setMenuItems] = useState<RestaurantInventoryItem[]>([]);
  const [supplies, setSupplies] = useState<RestaurantInventoryItem[]>([]);
  const [locations, setLocations] = useState<RestaurantLocation[]>([]);
  const [recipes, setRecipes] = useState<RestaurantRecipe[]>([]);
  const [orders, setOrders] = useState<RestaurantKitchenOrder[]>([]);
  const [movements, setMovements] = useState<RestaurantStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ingredientData, menuItemData, supplyData, locationData, recipeData, orderData, movementData] = await Promise.all([
        getInventory({ itemType: 'INGREDIENT' }),
        getInventory({ itemType: 'MENU_ITEM' }),
        getInventory({ itemType: 'SUPPLY' }),
        getLocations(),
        getRecipes(),
        getKitchenOrders(),
        getStockMovements(),
      ]);
      setIngredients(ingredientData);
      setMenuItems(menuItemData);
      setSupplies(supplyData);
      setLocations(locationData);
      setRecipes(recipeData);
      setOrders(orderData);
      setMovements(movementData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    ingredients,
    menuItems,
    supplies,
    allItems: [...ingredients, ...menuItems, ...supplies],
    locations,
    recipes,
    orders,
    movements,
    loading,
    error,
    reload,
  };
}

function Page({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Status({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-primary shadow-sm">
        <RefreshCw className="size-4 animate-spin" />
        Loading restaurant data from the shared backend...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertTriangle className="size-4" />
        {error}
      </div>
    );
  }
  return null;
}

function Stat({ label, value, icon, tone = 'orange' }: { label: string; value: string | number; icon: React.ReactNode; tone?: 'orange' | 'green' | 'red' | 'blue' }) {
  const tones = {
    orange: 'bg-[#E0F7F7] text-[#005656] border-[#00A7A5]/20',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`grid size-11 place-items-center rounded-xl border ${tones[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function ItemTable({ items, emptyText = 'No restaurant items yet.' }: { items: RestaurantInventoryItem[]; emptyText?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-wide text-[#005656]">
          <tr>
            <th className="px-5 py-3">Item</th>
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">Category</th>
            <th className="px-5 py-3">Qty</th>
            <th className="px-5 py-3">Expiry</th>
            <th className="px-5 py-3">Location</th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f3f4f6]">
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">{emptyText}</td>
            </tr>
          ) : (
            items.map((item) => {
              const status = stockStatus(item);
              return (
                <tr key={item.id} className="hover:bg-muted">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku ?? item.unit ?? 'restaurant item'}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{item.itemType ? itemTypes[item.itemType as ItemType] ?? item.itemType : '-'}</td>
                  <td className="px-5 py-4 text-foreground">{item.category}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">{item.quantity} {item.unit ?? ''}</td>
                  <td className={`px-5 py-4 ${isExpired(item) ? 'font-semibold text-red-700' : 'text-muted-foreground'}`}>{dateText(item.expiryDate)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{item.location?.name ?? 'Unassigned'}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function FoodItemForm({ locations, onSaved, onCancel }: { locations: RestaurantLocation[]; onSaved: () => void; onCancel?: () => void }) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    itemType: 'INGREDIENT' as ItemType,
    category: 'Produce',
    quantity: 0,
    price: 0,
    unit: 'pcs',
    minStock: 0,
    maxStock: 0,
    reorderPoint: 0,
    expiryDate: '',
    storageTemperature: 'Dry storage',
    locationId: locations[0]?.id ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.locationId && locations[0]?.id) {
      setForm((current) => ({ ...current, locationId: locations[0].id }));
    }
  }, [form.locationId, locations]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.locationId) {
      alert('Please create or select a location first.');
      return;
    }
    setSaving(true);
    try {
      await createInventoryItem({
        ...form,
        sku: form.sku || undefined,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        quantity: Number(form.quantity),
        price: Number(form.price),
        minStock: Number(form.minStock),
        maxStock: Number(form.maxStock),
        reorderPoint: Number(form.reorderPoint),
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save restaurant item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Name</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Type</span>
          <select value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value as ItemType })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
            {Object.entries(itemTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">SKU</span>
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Category</span>
          <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Quantity</span>
          <input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Unit</span>
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Price / Cost</span>
          <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Reorder Point</span>
          <input type="number" min="0" step="0.01" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Expiry</span>
          <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Storage</span>
          <input value={form.storageTemperature} onChange={(e) => setForm({ ...form, storageTemperature: e.target.value })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium text-foreground">Location</span>
          <select required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
            <option value="">Select location</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-[#d1d5db] px-4 py-2 text-sm font-semibold text-foreground">Cancel</button>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <PackageCheck className="size-4" />
          {saving ? 'Saving...' : 'Save Item'}
        </button>
      </div>
    </form>
  );
}

function MovementForm({ items, locations, onSaved, defaultType = 'STOCK_IN' }: { items: RestaurantInventoryItem[]; locations: RestaurantLocation[]; onSaved: () => void; defaultType?: MovementType }) {
  const [itemId, setItemId] = useState('');
  const [type, setType] = useState<MovementType>(defaultType);
  const [quantity, setQuantity] = useState(1);
  const [locationId, setLocationId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!itemId && items[0]?.id) setItemId(items[0].id);
    const selected = items.find((item) => item.id === itemId);
    if (!locationId && (selected?.locationId || locations[0]?.id)) setLocationId(selected?.locationId ?? locations[0].id);
  }, [itemId, items, locationId, locations]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemId) return;
    setSaving(true);
    try {
      await createStockMovement({
        itemId,
        locationId: locationId || undefined,
        type,
        quantity: Number(quantity),
        reason,
        referenceType: ['SPOILAGE', 'EXPIRY'].includes(type) ? 'RESTAURANT_STOCK_CONTROL' : undefined,
      });
      setReason('');
      setQuantity(1);
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record stock movement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-5">
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium text-foreground">Item</span>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
            {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as MovementType)} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
            {Object.entries(movementTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Qty</span>
          <input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-foreground">Location</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 md:col-span-5">
          <span className="text-sm font-medium text-foreground">Reason</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={saving || items.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <ClipboardList className="size-4" />
          {saving ? 'Recording...' : 'Record Movement'}
        </button>
      </div>
    </form>
  );
}

function RecipeEditor({ ingredients, menuItems, onSaved }: { ingredients: RestaurantInventoryItem[]; menuItems: RestaurantInventoryItem[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    category: 'Main',
    servings: 1,
    sellingPrice: 0,
    menuItemId: '',
    ingredients: [{ itemId: ingredients[0]?.id ?? '', quantity: 1, unit: ingredients[0]?.unit ?? 'pcs', unitCost: 0 }],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.ingredients[0]?.itemId && ingredients[0]?.id) {
      setForm((current) => ({ ...current, ingredients: [{ ...current.ingredients[0], itemId: ingredients[0].id, unit: ingredients[0].unit ?? 'pcs' }] }));
    }
  }, [form.ingredients, ingredients]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const validIngredients = form.ingredients.filter((ingredient) => ingredient.itemId && ingredient.quantity > 0);
    if (!validIngredients.length) {
      alert('Add at least one ingredient.');
      return;
    }
    setSaving(true);
    try {
      await createRecipe({
        name: form.name,
        category: form.category,
        servings: Number(form.servings),
        yieldPercentage: 100,
        sellingPrice: Number(form.sellingPrice),
        menuItemId: form.menuItemId || undefined,
        ingredients: validIngredients.map((ingredient) => ({
          itemId: ingredient.itemId,
          quantity: Number(ingredient.quantity),
          unit: ingredient.unit,
          unitCost: Number(ingredient.unitCost),
        })),
      });
      setForm({ name: '', category: 'Main', servings: 1, sellingPrice: 0, menuItemId: '', ingredients: [{ itemId: ingredients[0]?.id ?? '', quantity: 1, unit: ingredients[0]?.unit ?? 'pcs', unitCost: 0 }] });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const updateIngredient = (index: number, patch: Partial<(typeof form.ingredients)[number]>) => {
    setForm((current) => ({ ...current, ingredients: current.ingredients.map((ingredient, currentIndex) => currentIndex === index ? { ...ingredient, ...patch } : ingredient) }));
  };

  return (
    <form onSubmit={save} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <input required placeholder="Recipe name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm md:col-span-2" />
        <input required placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        <input type="number" min="1" value={form.servings} onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })} className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        <input type="number" min="0" step="0.01" placeholder="Selling price" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
        <select value={form.menuItemId} onChange={(e) => setForm({ ...form, menuItemId: e.target.value })} className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm md:col-span-3">
          <option value="">No linked menu item</option>
          {menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Ingredients</h3>
          <button type="button" onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { itemId: ingredients[0]?.id ?? '', quantity: 1, unit: ingredients[0]?.unit ?? 'pcs', unitCost: 0 }] })} className="inline-flex items-center gap-2 rounded-xl border border-[#00A7A5]/30 px-3 py-2 text-sm font-semibold text-primary">
            <Plus className="size-4" />
            Add Ingredient
          </button>
        </div>
        {form.ingredients.map((ingredient, index) => (
          <div key={`ingredient-${index}`} className="grid gap-3 rounded-xl bg-muted p-3 md:grid-cols-5">
            <select value={ingredient.itemId} onChange={(e) => {
              const selected = ingredients.find((item) => item.id === e.target.value);
              updateIngredient(index, { itemId: e.target.value, unit: selected?.unit ?? ingredient.unit });
            }} className="rounded-xl border border-[#fed7aa] px-3 py-2 text-sm md:col-span-2">
              {ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input type="number" min="0.01" step="0.01" value={ingredient.quantity} onChange={(e) => updateIngredient(index, { quantity: Number(e.target.value) })} className="rounded-xl border border-[#fed7aa] px-3 py-2 text-sm" />
            <input value={ingredient.unit} onChange={(e) => updateIngredient(index, { unit: e.target.value })} className="rounded-xl border border-[#fed7aa] px-3 py-2 text-sm" />
            <button type="button" onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, currentIndex) => currentIndex !== index) })} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Remove</button>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={saving || ingredients.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <ChefHat className="size-4" />
          {saving ? 'Saving...' : 'Save Recipe'}
        </button>
      </div>
    </form>
  );
}

function RecipeList({ recipes, onChanged }: { recipes: RestaurantRecipe[]; onChanged: () => void }) {
  const toggleRecipe = async (recipe: RestaurantRecipe) => {
    try {
      await updateRecipe(recipe.id, { isActive: !recipe.isActive });
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update recipe');
    }
  };

  const removeRecipe = async (recipe: RestaurantRecipe) => {
    if (!confirm(`Delete ${recipe.name}?`)) return;
    try {
      await deleteRecipe(recipe.id);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete recipe');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {recipes.map((recipe) => (
        <div key={recipe.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-foreground">{recipe.name}</h3>
              <p className="text-sm text-muted-foreground">{recipe.category} / {recipe.servings} servings</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${recipe.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{recipe.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="mt-4 space-y-2">
            {recipe.ingredients.map((ingredient) => (
              <div key={ingredient.id} className="flex justify-between rounded-xl bg-[#f9fafb] px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{ingredient.item?.name ?? 'Ingredient'}</span>
                <span className="text-muted-foreground">{ingredient.quantity} {ingredient.unit ?? ingredient.item?.unit ?? ''}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => toggleRecipe(recipe)} className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm font-semibold text-foreground">{recipe.isActive ? 'Deactivate' : 'Activate'}</button>
            <button type="button" onClick={() => removeRecipe(recipe)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Delete</button>
          </div>
        </div>
      ))}
      {recipes.length === 0 && <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">No recipes yet.</div>}
    </div>
  );
}

function KitchenOrders({ recipes, orders, onChanged }: { recipes: RestaurantRecipe[]; orders: RestaurantKitchenOrder[]; onChanged: () => void }) {
  const activeRecipes = recipes.filter((recipe) => recipe.isActive);
  const [recipeId, setRecipeId] = useState('');
  const [receiptNo, setReceiptNo] = useState(() => `REST-${Date.now().toString().slice(-6)}`);
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recipeId && activeRecipes[0]?.id) setRecipeId(activeRecipes[0].id);
  }, [recipeId, activeRecipes]);

  const complete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recipeId) return;
    setSaving(true);
    try {
      await completeKitchenOrder({ recipeId, receiptNo, quantity: Number(quantity) });
      setReceiptNo(`REST-${Date.now().toString().slice(-6)}`);
      setQuantity(1);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to complete kitchen order');
    } finally {
      setSaving(false);
    }
  };

  const voidOrder = async (order: RestaurantKitchenOrder) => {
    const reason = prompt(`Reason for voiding ${order.receiptNo}?`);
    if (!reason) return;
    try {
      await voidKitchenOrder(order.id, reason);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to void order');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <form onSubmit={complete} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-foreground">Complete Kitchen Order</h3>
        <div className="space-y-4">
          <input required value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
          <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
            {activeRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
          </select>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" />
          <button type="submit" disabled={saving || activeRecipes.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <Utensils className="size-4" />
            {saving ? 'Completing...' : 'Complete and Deduct Stock'}
          </button>
        </div>
      </form>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-[#005656]">
            <tr><th className="px-5 py-3">Receipt</th><th className="px-5 py-3">Recipe</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-5 py-4 font-semibold text-foreground">{order.receiptNo}</td>
                <td className="px-5 py-4 text-foreground">{order.recipe?.name ?? 'Recipe'}</td>
                <td className="px-5 py-4 text-muted-foreground">{order.quantity}</td>
                <td className="px-5 py-4">{order.status}</td>
                <td className="px-5 py-4">{order.status !== 'VOIDED' && <button type="button" onClick={() => voidOrder(order)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Void</button>}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No kitchen orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RestaurantDashboard() {
  const data = useRestaurantData();
  const expiring = data.ingredients.filter(isExpiringSoon);
  const lowStock = data.ingredients.filter((item) => item.quantity <= (item.reorderPoint ?? item.minStock ?? 0));
  const value = data.allItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  return (
    <Page title="Restaurant Dashboard" subtitle="Food inventory, recipes, kitchen orders, and stock movement data from the shared backend.">
      <Status loading={data.loading} error={data.error} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Food Items" value={data.allItems.length} icon={<Package className="size-5" />} />
        <Stat label="Recipes" value={data.recipes.length} tone="green" icon={<ChefHat className="size-5" />} />
        <Stat label="Expiring Soon" value={expiring.length} tone="red" icon={<CalendarClock className="size-5" />} />
        <Stat label="Stock Value" value={money(value)} tone="blue" icon={<Boxes className="size-5" />} />
      </div>
      <ItemTable items={[...lowStock, ...expiring].slice(0, 8)} emptyText="No urgent restaurant stock attention." />
    </Page>
  );
}

export function RestaurantFoodInventory({ onAddItem }: { onAddItem?: () => void }) {
  const data = useRestaurantData();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ItemType | 'ALL'>('ALL');
  const filtered = useMemo(() => data.allItems.filter((item) => {
    const matchesType = type === 'ALL' || item.itemType === type;
    const matchesText = item.name.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesText;
  }), [data.allItems, query, type]);
  return (
    <Page title="Food Inventory" subtitle="Restaurant-specific items stored in the shared items table." action={onAddItem && <button type="button" onClick={onAddItem} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"><Plus className="size-4" />Add Food Item</button>}>
      <Status loading={data.loading} error={data.error} />
      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9ca3af]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search food inventory..." className="w-full rounded-xl border border-[#d1d5db] py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value as ItemType | 'ALL')} className="rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">
          <option value="ALL">All Types</option>
          {Object.entries(itemTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <ItemTable items={filtered} emptyText="No matching restaurant inventory." />
    </Page>
  );
}

export function RestaurantAddFoodItem({ onBack, onSaved }: { onBack?: () => void; onSaved?: () => void }) {
  const data = useRestaurantData();
  const saved = async () => {
    await data.reload();
    onSaved?.();
  };
  return (
    <Page title="Add Food Item" subtitle="Create restaurant-specific items through the shared inventory API." action={onBack && <button type="button" onClick={onBack} className="rounded-xl border border-[#d1d5db] px-4 py-2 text-sm font-semibold text-foreground">Back</button>}>
      <Status loading={data.loading} error={data.error} />
      <FoodItemForm locations={data.locations} onSaved={saved} onCancel={onBack} />
    </Page>
  );
}

export function RestaurantStockControl() {
  const data = useRestaurantData();
  const lowStock = data.ingredients.filter((item) => item.quantity <= (item.reorderPoint ?? item.minStock ?? 0));
  return (
    <Page title="Stock Control" subtitle="Record receiving, adjustments, spoilage, and expiry in the shared stock movement ledger.">
      <Status loading={data.loading} error={data.error} />
      <MovementForm items={data.allItems} locations={data.locations} onSaved={data.reload} />
      <ItemTable items={lowStock} emptyText="No low stock ingredients." />
    </Page>
  );
}

export function RestaurantRecipeBOM({ currentUser }: { currentUser?: CurrentUser }) {
  const data = useRestaurantData();
  return (
    <Page title="Recipe and BOM" subtitle={`Recipe-based stock deduction is backed by shared ingredients${currentUser?.email ? ` for ${currentUser.email}` : ''}.`}>
      <Status loading={data.loading} error={data.error} />
      <RecipeEditor ingredients={data.ingredients} menuItems={data.menuItems} onSaved={data.reload} />
      <RecipeList recipes={data.recipes} onChanged={data.reload} />
    </Page>
  );
}

export function RestaurantPOS({ currentUser }: { currentUser?: CurrentUser }) {
  const data = useRestaurantData();
  return (
    <Page title="POS / Kitchen Orders" subtitle={`Complete orders and deduct recipe ingredients${currentUser?.email ? ` as ${currentUser.email}` : ''}.`}>
      <Status loading={data.loading} error={data.error} />
      <KitchenOrders recipes={data.recipes} orders={data.orders} onChanged={data.reload} />
    </Page>
  );
}

export function RestaurantPurchaseOrders({ currentUser }: { currentUser?: CurrentUser }) {
  const data = useRestaurantData();
  return (
    <Page title="Purchase Orders" subtitle={`Use shared stock receiving for restaurant purchasing${currentUser?.email ? ` by ${currentUser.email}` : ''}.`}>
      <Status loading={data.loading} error={data.error} />
      <MovementForm items={data.allItems} locations={data.locations} onSaved={data.reload} defaultType="STOCK_IN" />
    </Page>
  );
}

export function RestaurantGoodsReceived({ currentUser }: { currentUser?: CurrentUser }) {
  return <RestaurantPurchaseOrders currentUser={currentUser} />;
}

export function RestaurantTransfers({ currentUser }: { currentUser?: CurrentUser }) {
  const data = useRestaurantData();
  return (
    <Page title="Transfers and Adjustments" subtitle={`Move or adjust restaurant stock${currentUser?.email ? ` as ${currentUser.email}` : ''}.`}>
      <Status loading={data.loading} error={data.error} />
      <MovementForm items={data.allItems} locations={data.locations} onSaved={data.reload} defaultType="TRANSFER_OUT" />
    </Page>
  );
}

export function RestaurantReports() {
  const data = useRestaurantData();
  const value = data.allItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const recipeMovements = data.movements.filter((movement) => movement.type === 'RECIPE_CONSUMPTION');
  const wasteMovements = data.movements.filter((movement) => movement.type === 'SPOILAGE' || movement.type === 'EXPIRY');
  return (
    <Page title="Restaurant Reports" subtitle="Reports use shared restaurant inventory, recipes, orders, and stock movements.">
      <Status loading={data.loading} error={data.error} />
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Inventory Value" value={money(value)} icon={<Boxes className="size-5" />} />
        <Stat label="Completed Orders" value={data.orders.filter((order) => order.status === 'COMPLETED').length} tone="green" icon={<CheckCircle className="size-5" />} />
        <Stat label="Recipe Deductions" value={recipeMovements.length} tone="blue" icon={<ChefHat className="size-5" />} />
        <Stat label="Spoilage / Expiry" value={wasteMovements.length} tone="red" icon={<AlertTriangle className="size-5" />} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...recipeMovements, ...wasteMovements].slice(0, 12).map((movement) => (
          <div key={movement.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="font-semibold text-foreground">{movement.item?.name ?? 'Item'}</p>
            <p className="text-sm text-muted-foreground">{movement.type} / {movement.quantity} {movement.unit ?? ''} / {dateText(movement.createdAt)}</p>
          </div>
        ))}
      </div>
    </Page>
  );
}

export function RestaurantMultiLocation() {
  const data = useRestaurantData();
  return (
    <Page title="Multi-Location" subtitle="Locations are shared and scoped by business.">
      <Status loading={data.loading} error={data.error} />
      <div className="grid gap-4 lg:grid-cols-3">
        {data.locations.map((location) => {
          const items = data.allItems.filter((item) => item.locationId === location.id);
          return (
            <div key={location.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-lg font-bold text-foreground">{location.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{items.length} restaurant items</p>
              <p className="mt-4 text-2xl font-bold text-primary">{money(items.reduce((sum, item) => sum + item.quantity * item.price, 0))}</p>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

export function RestaurantIngredientsView() {
  return <RestaurantFoodInventory />;
}

export function RestaurantMenuItemsView() {
  const data = useRestaurantData();
  return (
    <Page title="Menu Items" subtitle="Menu items use shared inventory with item_type MENU_ITEM.">
      <Status loading={data.loading} error={data.error} />
      <ItemTable items={data.menuItems} emptyText="No menu items yet." />
    </Page>
  );
}

export function RestaurantRecipesView() {
  return <RestaurantRecipeBOM />;
}

export function RestaurantKitchenOrdersView() {
  return <RestaurantPOS />;
}

export function RestaurantSpoilageView() {
  const data = useRestaurantData();
  const waste = data.movements.filter((movement) => movement.type === 'SPOILAGE' || movement.type === 'EXPIRY');
  return (
    <Page title="Spoilage and Expiry" subtitle="Record losses through the shared stock movement ledger.">
      <Status loading={data.loading} error={data.error} />
      <MovementForm items={data.ingredients} locations={data.locations} onSaved={data.reload} defaultType="SPOILAGE" />
      <div className="grid gap-4 lg:grid-cols-2">
        {waste.map((movement) => (
          <div key={movement.id} className="rounded-2xl border border-red-100 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{movement.item?.name ?? 'Ingredient'}</p>
                <p className="text-sm text-muted-foreground">{movement.type} / {dateText(movement.createdAt)}</p>
              </div>
              <XCircle className="size-5 text-red-600" />
            </div>
            <p className="mt-3 text-sm text-foreground">{movement.quantity} {movement.unit ?? ''}</p>
            {movement.reason && <p className="mt-1 text-xs text-muted-foreground">{movement.reason}</p>}
          </div>
        ))}
      </div>
    </Page>
  );
}
