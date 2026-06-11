import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit, Search, Trash2, X } from "lucide-react";
import {
  deleteInventoryItem,
  getInventory,
  getLocations,
  updateInventoryItem,
} from "../../app/api/client";
import { getStorageTemperatureOptions } from "../lib/inventoryLogic";

type Location = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  itemType: string;
  sku?: string;
  category: string;
  quantity: number;
  price: number;
  unit?: string;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  expiryDate?: string;
  storageTemperature?: string;
  locationId: string;
  location?: Location;
};

export function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storageTemperatures = getStorageTemperatureOptions();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ingredients, menuItems, supplies, locationData] = await Promise.all([
        getInventory({ itemType: "INGREDIENT" }),
        getInventory({ itemType: "MENU_ITEM" }),
        getInventory({ itemType: "SUPPLY" }),
        getLocations(),
      ]);
      setProducts([...ingredients, ...menuItems, ...supplies]);
      setLocations(locationData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load food inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        (typeFilter === "all" || product.itemType === typeFilter) &&
        (product.name.toLowerCase().includes(query) || (product.sku || "").toLowerCase().includes(query)),
    );
  }, [products, searchQuery, typeFilter]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await updateInventoryItem(editing.id, {
        name: editing.name,
        itemType: editing.itemType,
        sku: editing.sku || undefined,
        category: editing.category,
        quantity: Number(editing.quantity),
        price: Number(editing.price),
        unit: editing.unit || undefined,
        minStock: Number(editing.minStock ?? 0),
        maxStock: Number(editing.maxStock ?? editing.quantity),
        reorderPoint: Number(editing.reorderPoint ?? editing.minStock ?? 0),
        expiryDate: editing.expiryDate ? new Date(editing.expiryDate).toISOString() : undefined,
        storageTemperature: editing.storageTemperature || undefined,
        locationId: editing.locationId,
      });
      await loadData();
      setEditing(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update inventory item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setError(null);
    try {
      await deleteInventoryItem(product.id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete inventory item");
    }
  };

  const status = (product: Product) => {
    if (product.quantity <= 0) return "Out of stock";
    if (product.quantity <= (product.minStock ?? 0)) return "Critical";
    if (product.quantity <= (product.reorderPoint ?? 0)) return "Low";
    return "Healthy";
  };

  return (
    <div className="p-8">
      <div className="mb-8"><h1 className="text-xl font-bold">Food Inventory</h1><p className="text-sm text-muted-foreground">Ingredients, menu items, and supplies from PostgreSQL</p></div>
      {error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}<button onClick={() => setError(null)} className="ml-auto underline">Dismiss</button></div>}
      <div className="mb-6 flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search food inventory" className="w-full rounded-xl border border-input bg-input-background py-2 pl-10 pr-3" /></div><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-input bg-input-background px-3 py-2"><option value="all">All item types</option><option value="INGREDIENT">Ingredients</option><option value="MENU_ITEM">Menu items</option><option value="SUPPLY">Supplies</option></select></div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? <p className="p-8 text-center text-muted-foreground">Loading inventory...</p> : filteredProducts.length === 0 ? <p className="p-8 text-center text-muted-foreground">No food inventory found.</p> :
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-border bg-muted/50 text-left"><tr><th className="px-5 py-4">Item</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-border">{filteredProducts.map((product) => <tr key={product.id}><td className="px-5 py-4"><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku || "No SKU"}</p></td><td className="px-5 py-4">{product.itemType.replace("_", " ")}</td><td className="px-5 py-4">{product.category}</td><td className="px-5 py-4">{product.quantity} {product.unit}</td><td className="px-5 py-4">{product.location?.name}</td><td className="px-5 py-4">{status(product)}</td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => setEditing({ ...product, expiryDate: product.expiryDate?.slice(0, 10) })} className="rounded-lg p-2 hover:bg-muted"><Edit className="h-4 w-4" /></button><button onClick={() => void handleDelete(product)} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSave} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">Edit Food Item</h2><button type="button" onClick={() => setEditing(null)}><X className="h-5 w-5" /></button></div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">Name<input required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">SKU<input value={editing.sku || ""} onChange={(event) => setEditing({ ...editing, sku: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Category<input required value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Location<select value={editing.locationId} onChange={(event) => setEditing({ ...editing, locationId: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
              <label className="text-sm">Quantity<input type="number" min="0" step="0.001" value={editing.quantity} onChange={(event) => setEditing({ ...editing, quantity: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Unit<input value={editing.unit || ""} onChange={(event) => setEditing({ ...editing, unit: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Price<input type="number" min="0" step="0.01" value={editing.price} onChange={(event) => setEditing({ ...editing, price: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Reorder point<input type="number" min="0" step="0.001" value={editing.reorderPoint ?? 0} onChange={(event) => setEditing({ ...editing, reorderPoint: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Expiry date<input type="date" value={editing.expiryDate || ""} onChange={(event) => setEditing({ ...editing, expiryDate: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Storage temperature<select value={editing.storageTemperature || ""} onChange={(event) => setEditing({ ...editing, storageTemperature: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2"><option value="">Not set</option>{storageTemperatures.map((temperature) => <option key={temperature}>{temperature}</option>)}</select></label>
            </div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-white">{saving ? "Saving..." : "Save"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
