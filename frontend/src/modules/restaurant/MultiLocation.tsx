import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, MapPin, Package, Search, TrendingDown } from "lucide-react";
import { getInventory, getLocations } from "../../app/api/client";

type Location = {
  id: string;
  name: string;
  address: string;
  manager: string;
  phone: string;
  itemCount: number;
};

type InventoryItem = {
  id: string;
  name: string;
  sku?: string;
  category: string;
  quantity: number;
  price: number;
  costPrice?: number;
  unit?: string;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  storageTemperature?: string;
  locationId: string;
  location?: Location;
};

const stockStatus = (item: InventoryItem) => {
  if (item.quantity <= 0) return "Out of stock";
  if (item.quantity <= (item.minStock ?? 0)) return "Critical";
  if (item.quantity <= (item.reorderPoint ?? item.minStock ?? 0)) return "Low";
  if (item.maxStock && item.quantity > item.maxStock) return "Overstock";
  return "Healthy";
};

export function MultiLocation() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [viewMode, setViewMode] = useState<"products" | "locations">("products");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [locationData, ingredients, menuItems, supplies] = await Promise.all([
        getLocations(),
        getInventory({ itemType: "INGREDIENT" }),
        getInventory({ itemType: "MENU_ITEM" }),
        getInventory({ itemType: "SUPPLY" }),
      ]);
      setLocations(locationData);
      setInventory([...ingredients, ...menuItems, ...supplies]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredInventory = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return inventory.filter(
      (item) =>
        (selectedLocation === "all" || item.locationId === selectedLocation) &&
        (item.name.toLowerCase().includes(query) || (item.sku || "").toLowerCase().includes(query)),
    );
  }, [inventory, searchQuery, selectedLocation]);

  const locationSummaries = locations.map((location) => {
    const items = inventory.filter((item) => item.locationId === location.id);
    return {
      ...location,
      totalProducts: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      lowStock: items.filter((item) => ["Critical", "Low", "Out of stock"].includes(stockStatus(item))).length,
      totalValue: items.reduce((sum, item) => sum + item.quantity * (item.costPrice ?? item.price), 0),
    };
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-bold">Multi-Location Inventory</h1>
          <p className="text-sm text-muted-foreground">Live stock distribution across backend locations</p>
        </div>
        <div className="flex rounded-xl border border-border bg-card p-1">
          <button onClick={() => setViewMode("products")} className={`rounded-lg px-4 py-2 text-sm ${viewMode === "products" ? "bg-primary text-white" : ""}`}>Products</button>
          <button onClick={() => setViewMode("locations")} className={`rounded-lg px-4 py-2 text-sm ${viewMode === "locations" ? "bg-primary text-white" : ""}`}>Locations</button>
        </div>
      </div>

      {error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4"><Building2 className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Locations</p><p className="mt-2 text-2xl font-bold">{locations.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><Package className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Inventory records</p><p className="mt-2 text-2xl font-bold">{inventory.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><TrendingDown className="h-5 w-5 text-orange-600" /><p className="mt-3 text-sm text-muted-foreground">Low-stock records</p><p className="mt-2 text-2xl font-bold">{inventory.filter((item) => ["Critical", "Low", "Out of stock"].includes(stockStatus(item))).length}</p></div>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products" className="w-full rounded-xl border border-input bg-input-background py-2 pl-10 pr-3" /></div>
        <select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)} className="rounded-xl border border-input bg-input-background px-3 py-2"><option value="all">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
      </div>

      {loading ? <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Loading locations...</p> : viewMode === "locations" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locationSummaries.map((location) => (
            <div key={location.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3"><MapPin className="mt-1 h-5 w-5 text-primary" /><div><h2 className="font-semibold">{location.name}</h2><p className="text-sm text-muted-foreground">{location.address}</p></div></div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted-foreground">Manager</p><p className="font-medium">{location.manager}</p></div><div><p className="text-muted-foreground">Products</p><p className="font-medium">{location.totalProducts}</p></div><div><p className="text-muted-foreground">Quantity</p><p className="font-medium">{location.totalQuantity.toLocaleString()}</p></div><div><p className="text-muted-foreground">Low stock</p><p className="font-medium text-orange-700">{location.lowStock}</p></div></div>
              <p className="mt-4 border-t border-border pt-4 font-semibold">PHP {location.totalValue.toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {filteredInventory.length === 0 ? <p className="p-8 text-center text-muted-foreground">No inventory found.</p> :
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-border bg-muted/50 text-left"><tr><th className="px-5 py-4">Product</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Storage</th><th className="px-5 py-4">Value</th></tr></thead><tbody className="divide-y divide-border">{filteredInventory.map((item) => <tr key={item.id}><td className="px-5 py-4"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku || item.category}</p></td><td className="px-5 py-4">{item.location?.name || "Unassigned"}</td><td className="px-5 py-4">{item.quantity} {item.unit}</td><td className="px-5 py-4">{stockStatus(item)}</td><td className="px-5 py-4">{item.storageTemperature || "Not set"}</td><td className="px-5 py-4">PHP {(item.quantity * (item.costPrice ?? item.price)).toLocaleString()}</td></tr>)}</tbody></table></div>}
        </div>
      )}
    </div>
  );
}
