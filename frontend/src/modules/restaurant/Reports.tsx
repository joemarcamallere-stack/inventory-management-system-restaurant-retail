import { useEffect, useState } from "react";
import { AlertCircle, ClipboardList, Package, PhilippinePeso, ReceiptText } from "lucide-react";
import { getGoodsReceipts, getInventory, getKitchenOrders, getPurchaseOrders, getStockMovements } from "../../app/api/client";

export function Reports() {
  const [data, setData] = useState<any>({ inventory: [], orders: [], purchaseOrders: [], receipts: [], movements: [] });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([
      Promise.all([getInventory({ itemType: "INGREDIENT" }), getInventory({ itemType: "MENU_ITEM" }), getInventory({ itemType: "SUPPLY" })]).then((groups) => groups.flat()),
      getKitchenOrders(), getPurchaseOrders(), getGoodsReceipts(), getStockMovements(),
    ]).then(([inventory, orders, purchaseOrders, receipts, movements]) => setData({ inventory, orders, purchaseOrders, receipts, movements }))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Failed to load reports"));
  }, []);
  const inventoryValue = data.inventory.reduce((sum: number, item: any) => sum + item.quantity * (item.costPrice ?? item.price), 0);
  const purchaseValue = data.purchaseOrders.filter((order: any) => order.status !== "CANCELLED" && order.status !== "REJECTED").reduce((sum: number, order: any) => sum + order.totalAmount, 0);
  const salesValue = data.orders.filter((order: any) => order.status !== "VOIDED").reduce((sum: number, order: any) => sum + order.quantity * (order.recipe?.sellingPrice ?? 0), 0);
  const wasteValue = data.movements.filter((movement: any) => ["SPOILAGE", "EXPIRY"].includes(movement.type)).reduce((sum: number, movement: any) => sum + movement.quantity * (movement.item?.costPrice ?? movement.item?.price ?? 0), 0);
  const cards = [{ label: "Inventory value", value: `PHP ${inventoryValue.toLocaleString()}`, icon: Package }, { label: "Purchase value", value: `PHP ${purchaseValue.toLocaleString()}`, icon: ClipboardList }, { label: "Kitchen sales", value: `PHP ${salesValue.toLocaleString()}`, icon: PhilippinePeso }, { label: "Waste value", value: `PHP ${wasteValue.toLocaleString()}`, icon: AlertCircle }];
  return <div className="p-8"><div className="mb-8"><h1 className="text-xl font-bold">Restaurant Reports</h1><p className="text-sm text-muted-foreground">Operational totals calculated from backend records</p></div>{error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}<div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-border bg-card p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}</div><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold"><ReceiptText className="h-4 w-4" />Recent kitchen orders</h2><div className="space-y-3">{data.orders.slice(0, 10).map((order: any) => <div key={order.id} className="flex justify-between text-sm"><span>{order.receiptNo} | {order.recipe?.name}</span><span>{order.status}</span></div>)}</div></div><div className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 font-semibold">Recent goods receipts</h2><div className="space-y-3">{data.receipts.slice(0, 10).map((receipt: any) => <div key={receipt.id} className="flex justify-between text-sm"><span>{receipt.receiptNumber} | {receipt.purchaseOrder?.supplier?.name}</span><span>{receipt.items.length} lines</span></div>)}</div></div></div></div>;
}
