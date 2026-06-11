import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Eye,
  Package,
  Search,
  X,
  XCircle,
} from "lucide-react";
import {
  getGoodsReceipts,
  getPurchaseOrders,
  receivePurchaseOrder,
} from "../../app/api/client";
import { getStorageTemperatureOptions } from "../lib/inventoryLogic";

type PurchaseOrderItem = {
  id: string;
  name: string;
  quantity: number;
  receivedQty: number;
  rejectedQty: number;
  unitPrice: number;
  inventoryItem?: { id: string; unit?: string; expiryDate?: string; storageTemperature?: string };
};

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  status: string;
  supplier?: { name: string };
  items: PurchaseOrderItem[];
  totalAmount: number;
  expectedDelivery?: string;
};

type ReceiptItem = {
  id: string;
  receivedQty: number;
  rejectedQty: number;
  condition?: string;
  notes?: string;
  purchaseOrderItem: PurchaseOrderItem;
  inventoryItem?: { unit?: string };
};

type GoodsReceipt = {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  notes?: string;
  createdAt: string;
  receivedBy?: { name: string; email: string };
  purchaseOrder: PurchaseOrder & { supplier?: { name: string } };
  items: ReceiptItem[];
};

type PendingReceipt = {
  kind: "pending";
  id: string;
  purchaseOrder: PurchaseOrder;
};

type CompletedReceipt = {
  kind: "completed";
  id: string;
  receipt: GoodsReceipt;
};

type ReceiptRow = PendingReceipt | CompletedReceipt;

type LineDecision = {
  accepted: string;
  expiryDate: string;
  storageTemperature: string;
  condition: string;
  notes: string;
};

const blankDecision = (quantity: number, item: PurchaseOrderItem): LineDecision => ({
  accepted: String(quantity),
  expiryDate: item.inventoryItem?.expiryDate?.slice(0, 10) || "",
  storageTemperature: item.inventoryItem?.storageTemperature || "",
  condition: "Accepted",
  notes: "",
});

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : "Not set";

export function GoodsReceived() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
  const [decisions, setDecisions] = useState<Record<string, LineDecision>>({});
  const [receiptNotes, setReceiptNotes] = useState("");
  const storageTemperatures = getStorageTemperatureOptions();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, receiptData] = await Promise.all([
        getPurchaseOrders(),
        getGoodsReceipts(),
      ]);
      setPurchaseOrders(orderData);
      setReceipts(receiptData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load receiving data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingOrders = useMemo(
    () =>
      purchaseOrders.filter(
        (order) =>
          ["APPROVED", "PARTIALLY_RECEIVED"].includes(order.status) &&
          order.items.some(
            (item) => item.receivedQty + item.rejectedQty < item.quantity,
          ),
      ),
    [purchaseOrders],
  );

  const rows = useMemo<ReceiptRow[]>(() => {
    const pending: ReceiptRow[] = pendingOrders.map((purchaseOrder) => ({
      kind: "pending",
      id: `pending-${purchaseOrder.id}`,
      purchaseOrder,
    }));
    const completed: ReceiptRow[] = receipts.map((receipt) => ({
      kind: "completed",
      id: receipt.id,
      receipt,
    }));
    return [...pending, ...completed];
  }, [pendingOrders, receipts]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const cutoff = new Date(now);
    if (dateFilter === "today") cutoff.setHours(0, 0, 0, 0);
    if (dateFilter === "week") cutoff.setDate(now.getDate() - 7);
    if (dateFilter === "month") cutoff.setMonth(now.getMonth() - 1);

    return rows.filter((row) => {
      const order = row.kind === "pending" ? row.purchaseOrder : row.receipt.purchaseOrder;
      const receiptNumber = row.kind === "pending" ? "pending" : row.receipt.receiptNumber;
      const matchesSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        receiptNumber.toLowerCase().includes(query) ||
        (order.supplier?.name || "").toLowerCase().includes(query);
      if (!matchesSearch || dateFilter === "all" || row.kind === "pending") return matchesSearch;
      return new Date(row.receipt.createdAt) >= cutoff;
    });
  }, [dateFilter, rows, searchQuery]);

  const openQualityCheck = (order: PurchaseOrder) => {
    const next: Record<string, LineDecision> = {};
    order.items.forEach((item) => {
      const remaining = Math.max(item.quantity - item.receivedQty - item.rejectedQty, 0);
      if (remaining > 0) next[item.id] = blankDecision(remaining, item);
    });
    setDecisions(next);
    setReceiptNotes("");
    setSelectedOrder(order);
  };

  const updateDecision = (itemId: string, patch: Partial<LineDecision>) => {
    setDecisions((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...patch },
    }));
  };

  const handleReceive = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedOrder) return;

    const items = selectedOrder.items
      .map((item) => {
        const remaining = Math.max(item.quantity - item.receivedQty - item.rejectedQty, 0);
        const decision = decisions[item.id];
        const accepted = Math.min(Math.max(Number(decision?.accepted) || 0, 0), remaining);
        const rejected = remaining - accepted;
        return {
          id: item.id,
          receivedQty: accepted,
          rejectedQty: rejected,
          condition: decision?.condition || (accepted > 0 ? "Accepted" : "Rejected"),
          notes: decision?.notes || undefined,
          expiryDate:
            accepted > 0 && decision?.expiryDate
              ? new Date(`${decision.expiryDate}T00:00:00`).toISOString()
              : undefined,
          storageTemperature:
            accepted > 0 ? decision?.storageTemperature || undefined : undefined,
        };
      })
      .filter((item) => item.receivedQty + item.rejectedQty > 0);

    const missingMetadata = items.find(
      (item) =>
        item.receivedQty > 0 &&
        (!item.expiryDate || !item.storageTemperature),
    );
    if (missingMetadata) {
      setError("Accepted items require an expiry date and storage temperature.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await receivePurchaseOrder(selectedOrder.id, items, receiptNotes || undefined);
      await loadData();
      setSelectedOrder(null);
      setDecisions({});
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to receive purchase order");
    } finally {
      setSaving(false);
    }
  };

  const receiptStatus = (receipt: GoodsReceipt) => {
    const accepted = receipt.items.reduce((sum, item) => sum + item.receivedQty, 0);
    const rejected = receipt.items.reduce((sum, item) => sum + item.rejectedQty, 0);
    if (accepted === 0) return "Rejected";
    if (rejected > 0) return "Partial";
    return "Verified";
  };

  const stats = [
    { label: "Pending QC", value: pendingOrders.length, icon: AlertCircle },
    { label: "Receipt Records", value: receipts.length, icon: Package },
    { label: "Verified", value: receipts.filter((receipt) => receiptStatus(receipt) === "Verified").length, icon: CheckCircle },
    { label: "With Rejections", value: receipts.filter((receipt) => receiptStatus(receipt) !== "Verified").length, icon: XCircle },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-foreground">Goods Received</h1>
        <p className="text-sm text-muted-foreground">Transactional receiving and quality records from PostgreSQL</p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto underline">Dismiss</button>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search GR, PO, or supplier" className="w-full rounded-xl border border-input bg-input-background py-2 pl-10 pr-3" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded-xl border border-input bg-input-background py-2 pl-10 pr-8">
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last month</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">Loading receiving records...</p>
        ) : filteredRows.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No receiving records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50 text-left text-sm">
                <tr>
                  <th className="px-5 py-4">Receipt</th>
                  <th className="px-5 py-4">PO Reference</th>
                  <th className="px-5 py-4">Supplier</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Items</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.map((row) => {
                  const order = row.kind === "pending" ? row.purchaseOrder : row.receipt.purchaseOrder;
                  const status = row.kind === "pending" ? "Pending QC" : receiptStatus(row.receipt);
                  return (
                    <tr key={row.id}>
                      <td className="px-5 py-4 font-medium text-primary">{row.kind === "pending" ? "Awaiting receipt" : row.receipt.receiptNumber}</td>
                      <td className="px-5 py-4">{order.orderNumber}</td>
                      <td className="px-5 py-4">{order.supplier?.name || "No supplier"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{row.kind === "pending" ? formatDate(order.expectedDelivery) : formatDate(row.receipt.createdAt)}</td>
                      <td className="px-5 py-4">{row.kind === "pending" ? order.items.length : row.receipt.items.length}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs ${
                          status === "Verified"
                            ? "border-green-200 bg-green-100 text-green-700"
                            : status === "Pending QC"
                              ? "border-yellow-200 bg-yellow-100 text-yellow-700"
                              : "border-orange-200 bg-orange-100 text-orange-700"
                        }`}>{status}</span>
                      </td>
                      <td className="px-5 py-4">
                        {row.kind === "pending" ? (
                          <button onClick={() => openQualityCheck(order)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs text-white">
                            <ClipboardCheck className="h-4 w-4" /> Quality Check
                          </button>
                        ) : (
                          <button onClick={() => setSelectedReceipt(row.receipt)} className="rounded-lg p-2 hover:bg-muted"><Eye className="h-4 w-4" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleReceive} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">Quality Check</h2>
                <p className="text-sm text-muted-foreground">{selectedOrder.orderNumber} | {selectedOrder.supplier?.name}</p>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)}><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              {selectedOrder.items.map((item) => {
                const remaining = Math.max(item.quantity - item.receivedQty - item.rejectedQty, 0);
                if (remaining <= 0) return null;
                const decision = decisions[item.id] || blankDecision(remaining, item);
                const accepted = Math.min(Math.max(Number(decision.accepted) || 0, 0), remaining);
                return (
                  <div key={item.id} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex justify-between">
                      <div><p className="font-semibold">{item.name}</p><p className="text-sm text-muted-foreground">Remaining: {remaining} {item.inventoryItem?.unit || "units"}</p></div>
                      <p className="text-sm font-medium">Rejected: {remaining - accepted}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <label className="text-xs">Accepted quantity<input type="number" min="0" max={remaining} step="0.001" value={decision.accepted} onChange={(event) => updateDecision(item.id, { accepted: event.target.value })} className="mt-1 w-full rounded-lg border border-input bg-input-background p-2 text-sm" /></label>
                      <label className="text-xs">Expiry date<input type="date" value={decision.expiryDate} onChange={(event) => updateDecision(item.id, { expiryDate: event.target.value })} disabled={accepted <= 0} className="mt-1 w-full rounded-lg border border-input bg-input-background p-2 text-sm disabled:opacity-50" /></label>
                      <label className="text-xs">Storage temperature<select value={decision.storageTemperature} onChange={(event) => updateDecision(item.id, { storageTemperature: event.target.value })} disabled={accepted <= 0} className="mt-1 w-full rounded-lg border border-input bg-input-background p-2 text-sm disabled:opacity-50"><option value="">Select temperature</option>{storageTemperatures.map((temperature) => <option key={temperature} value={temperature}>{temperature}</option>)}</select></label>
                      <label className="text-xs">Condition<select value={decision.condition} onChange={(event) => updateDecision(item.id, { condition: event.target.value })} className="mt-1 w-full rounded-lg border border-input bg-input-background p-2 text-sm"><option>Accepted</option><option>Partial</option><option>Damaged</option><option>Expired</option><option>Rejected</option></select></label>
                      <label className="text-xs md:col-span-2">Inspection notes<input value={decision.notes} onChange={(event) => updateDecision(item.id, { notes: event.target.value })} className="mt-1 w-full rounded-lg border border-input bg-input-background p-2 text-sm" /></label>
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="mt-5 block text-sm">Receipt notes<textarea value={receiptNotes} onChange={(event) => setReceiptNotes(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-input bg-input-background p-3" /></label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedOrder(null)} className="rounded-xl border border-border px-4 py-2">Cancel</button>
              <button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving..." : "Complete Receipt"}</button>
            </div>
          </form>
        </div>
      )}

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-5 flex justify-between">
              <div><h2 className="text-xl font-bold">{selectedReceipt.receiptNumber}</h2><p className="text-sm text-muted-foreground">Received by {selectedReceipt.receivedBy?.name || selectedReceipt.receivedBy?.email || "Unknown"}</p></div>
              <button onClick={() => setSelectedReceipt(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {selectedReceipt.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex justify-between"><p className="font-medium">{item.purchaseOrderItem.name}</p><p className="text-sm">{item.condition || "Inspected"}</p></div>
                  <p className="mt-1 text-sm text-muted-foreground">Accepted {item.receivedQty}; rejected {item.rejectedQty}</p>
                  {item.notes && <p className="mt-2 text-sm">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
