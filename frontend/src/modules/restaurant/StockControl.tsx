import { useEffect, useState } from "react";
import { AlertCircle, Package, TrendingDown, XCircle } from "lucide-react";
import { getInventory, getStockMovements } from "../../app/api/client";

export function StockControl() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([
      Promise.all([getInventory({ itemType: "INGREDIENT" }), getInventory({ itemType: "MENU_ITEM" }), getInventory({ itemType: "SUPPLY" })]).then((groups) => groups.flat()),
      getStockMovements(),
    ]).then(([items, records]) => { setInventory(items); setMovements(records); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Failed to load stock control"));
  }, []);
  const lowStock = inventory.filter((item) => item.quantity <= (item.reorderPoint ?? item.minStock ?? 0));
  const expired = inventory.filter((item) => item.expiryDate && new Date(item.expiryDate) <= new Date());
  const waste = movements.filter((movement) => ["SPOILAGE", "EXPIRY"].includes(movement.type));
  return <div className="p-8"><div className="mb-8"><h1 className="text-xl font-bold">Stock Control & Alerts</h1><p className="text-sm text-muted-foreground">Backend stock levels and movement audit trail</p></div>{error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}<div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3"><div className="rounded-2xl border border-border bg-card p-5"><Package className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Inventory records</p><p className="mt-2 text-2xl font-bold">{inventory.length}</p></div><div className="rounded-2xl border border-border bg-card p-5"><TrendingDown className="h-5 w-5 text-orange-600" /><p className="mt-3 text-sm text-muted-foreground">Low stock</p><p className="mt-2 text-2xl font-bold">{lowStock.length}</p></div><div className="rounded-2xl border border-border bg-card p-5"><XCircle className="h-5 w-5 text-red-600" /><p className="mt-3 text-sm text-muted-foreground">Expired</p><p className="mt-2 text-2xl font-bold">{expired.length}</p></div></div><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-semibold">Reorder alerts</h2><div className="space-y-3">{lowStock.map((item) => <div key={item.id} className="flex justify-between text-sm"><span>{item.name}</span><span>{item.quantity} / reorder {item.reorderPoint ?? item.minStock ?? 0}</span></div>)}</div></div><div className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-semibold">Waste and expiry log</h2><div className="space-y-3">{waste.slice(0, 12).map((movement) => <div key={movement.id} className="flex justify-between text-sm"><span>{movement.item?.name} | {movement.type}</span><span>{movement.quantity} {movement.unit}</span></div>)}</div></div></div></div>;
}
