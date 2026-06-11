import { useEffect, useState } from "react";
import { AlertCircle, ChefHat, ClipboardList, Package, TrendingDown } from "lucide-react";
import { getInventory, getKitchenOrders, getPurchaseOrders, getRecipes } from "../../app/api/client";

export function Dashboard() {
  const [data, setData] = useState<any>({ inventory: [], recipes: [], orders: [], purchaseOrders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      Promise.all([getInventory({ itemType: "INGREDIENT" }), getInventory({ itemType: "MENU_ITEM" }), getInventory({ itemType: "SUPPLY" })]).then((groups) => groups.flat()),
      getRecipes(),
      getKitchenOrders(),
      getPurchaseOrders(),
    ]).then(([inventory, recipes, orders, purchaseOrders]) => setData({ inventory, recipes, orders, purchaseOrders }))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const lowStock = data.inventory.filter((item: any) => item.quantity <= (item.reorderPoint ?? item.minStock ?? 0));
  const today = new Date().toDateString();
  const todayOrders = data.orders.filter((order: any) => new Date(order.createdAt).toDateString() === today && order.status !== "VOIDED");
  const stats = [
    { label: "Food Items", value: data.inventory.length, icon: Package },
    { label: "Low Stock", value: lowStock.length, icon: TrendingDown },
    { label: "Active Recipes", value: data.recipes.filter((recipe: any) => recipe.isActive).length, icon: ChefHat },
    { label: "Pending POs", value: data.purchaseOrders.filter((order: any) => ["SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED"].includes(order.status)).length, icon: ClipboardList },
  ];

  if (loading) return <div className="p-8 text-muted-foreground">Loading restaurant dashboard...</div>;
  return <div className="p-8"><div className="mb-8"><h1 className="text-xl font-bold">Restaurant Dashboard</h1><p className="text-sm text-muted-foreground">Live operational summary from PostgreSQL</p></div>{error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}<div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-border bg-card p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-semibold">Low-stock items</h2>{lowStock.length === 0 ? <p className="text-sm text-muted-foreground">No low-stock items.</p> : <div className="space-y-3">{lowStock.slice(0, 8).map((item: any) => <div key={item.id} className="flex justify-between text-sm"><span>{item.name}</span><span className="text-orange-700">{item.quantity} {item.unit}</span></div>)}</div>}</div><div className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-semibold">Today's kitchen orders</h2>{todayOrders.length === 0 ? <p className="text-sm text-muted-foreground">No orders today.</p> : <div className="space-y-3">{todayOrders.slice(0, 8).map((order: any) => <div key={order.id} className="flex justify-between text-sm"><span>{order.receiptNo} | {order.recipe?.name}</span><span>{order.quantity}</span></div>)}</div>}</div></div></div>;
}
