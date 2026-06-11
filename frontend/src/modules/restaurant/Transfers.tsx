import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  cancelTransfer,
  completeTransfer,
  createStockMovement,
  createTransfer,
  dispatchTransfer,
  getInventory,
  getLocations,
  getStockMovements,
  getTransfers,
} from "../../app/api/client";

type Location = { id: string; name: string };
type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  price: number;
  locationId: string;
  location?: Location;
};
type Transfer = {
  id: string;
  transferNumber: string;
  status: string;
  notes?: string;
  createdAt: string;
  fromLocation: Location;
  toLocation: Location;
  createdBy?: { name: string };
  items: { id: string; quantity: number; inventoryItem: InventoryItem }[];
};
type Movement = {
  id: string;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  notes?: string;
  createdAt: string;
  item: InventoryItem;
  location: Location;
  createdBy?: { name: string };
};

const labelStatus = (value: string) =>
  value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function Transfers() {
  const [activeTab, setActiveTab] = useState<"transfers" | "adjustments" | "waste">("transfers");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [adjustments, setAdjustments] = useState<Movement[]>([]);
  const [waste, setWaste] = useState<Movement[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"transfer" | "adjustment" | "waste" | null>(null);
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [wasteType, setWasteType] = useState<"SPOILAGE" | "EXPIRY">("SPOILAGE");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [transferData, locationData, ingredients, menuItems, supplies, adjustmentData, spoilageData, expiryData] =
        await Promise.all([
          getTransfers(),
          getLocations(),
          getInventory({ itemType: "INGREDIENT" }),
          getInventory({ itemType: "MENU_ITEM" }),
          getInventory({ itemType: "SUPPLY" }),
          getStockMovements({ type: "ADJUSTMENT" }),
          getStockMovements({ type: "SPOILAGE" }),
          getStockMovements({ type: "EXPIRY" }),
        ]);
      setTransfers(transferData);
      setLocations(locationData);
      setInventory([...ingredients, ...menuItems, ...supplies]);
      setAdjustments(adjustmentData);
      setWaste([...spoilageData, ...expiryData].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load stock operations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sourceItems = inventory.filter(
    (item) => !fromLocationId || item.locationId === fromLocationId,
  );

  const resetForm = () => {
    setFromLocationId("");
    setToLocationId("");
    setItemId("");
    setQuantity("");
    setNotes("");
    setWasteType("SPOILAGE");
  };

  const execute = async (action: () => Promise<unknown>, message: string) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      await loadData();
      setModal(null);
      resetForm();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTransfer = (event: FormEvent) => {
    event.preventDefault();
    void execute(
      () =>
        createTransfer({
          fromLocationId,
          toLocationId,
          notes: notes || undefined,
          items: [{ inventoryItemId: itemId, quantity: Number(quantity) }],
        }),
      "Failed to create transfer",
    );
  };

  const handleCreateMovement = (event: FormEvent, type: "ADJUSTMENT" | "SPOILAGE" | "EXPIRY") => {
    event.preventDefault();
    const item = inventory.find((candidate) => candidate.id === itemId);
    if (!item) return;
    void execute(
      () =>
        createStockMovement({
          itemId,
          locationId: item.locationId,
          type,
          quantity: Number(quantity),
          reason:
            type === "ADJUSTMENT"
              ? "Manual restaurant inventory adjustment"
              : type === "EXPIRY"
                ? "Expired restaurant stock"
                : "Restaurant spoilage",
          referenceType: type === "ADJUSTMENT" ? "MANUAL_ADJUSTMENT" : "WASTE_LOG",
          notes: notes || undefined,
        }),
      "Failed to record stock movement",
    );
  };

  const filteredTransfers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return transfers.filter(
      (transfer) =>
        transfer.transferNumber.toLowerCase().includes(query) ||
        transfer.items.some((item) => item.inventoryItem.name.toLowerCase().includes(query)),
    );
  }, [searchQuery, transfers]);

  const filteredMovements = (records: Movement[]) => {
    const query = searchQuery.toLowerCase();
    return records.filter(
      (record) =>
        record.item.name.toLowerCase().includes(query) ||
        (record.reason || "").toLowerCase().includes(query),
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-bold">Transfers & Adjustments</h1>
          <p className="text-sm text-muted-foreground">Transactional stock operations persisted in PostgreSQL</p>
        </div>
        <button
          onClick={() => setModal(activeTab === "transfers" ? "transfer" : activeTab === "adjustments" ? "adjustment" : "waste")}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-white"
        >
          <Plus className="h-4 w-4" />
          {activeTab === "transfers" ? "New Transfer" : activeTab === "adjustments" ? "New Adjustment" : "Log Waste"}
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
          <button onClick={() => setError(null)} className="ml-auto underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6 flex gap-2 rounded-xl border border-border bg-card p-2">
        {(["transfers", "adjustments", "waste"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-4 py-2 text-sm capitalize ${activeTab === tab ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search records" className="w-full rounded-xl border border-input bg-input-background py-2 pl-10 pr-3" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">Loading stock operations...</p>
        ) : activeTab === "transfers" ? (
          filteredTransfers.length === 0 ? <p className="p-8 text-center text-muted-foreground">No transfers found.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left"><tr><th className="px-5 py-4">Transfer</th><th className="px-5 py-4">Route</th><th className="px-5 py-4">Items</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td className="px-5 py-4 font-medium text-primary">{transfer.transferNumber}</td>
                    <td className="px-5 py-4">{transfer.fromLocation.name} to {transfer.toLocation.name}</td>
                    <td className="px-5 py-4">{transfer.items.map((item) => `${item.inventoryItem.name} (${item.quantity})`).join(", ")}</td>
                    <td className="px-5 py-4">{labelStatus(transfer.status)}</td>
                    <td className="px-5 py-4"><div className="flex gap-2">
                      {transfer.status === "PENDING" && <button disabled={saving} title="Dispatch" onClick={() => void execute(() => dispatchTransfer(transfer.id), "Failed to dispatch transfer")} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"><Clock className="h-4 w-4" /></button>}
                      {transfer.status === "IN_TRANSIT" && <button disabled={saving} title="Complete" onClick={() => void execute(() => completeTransfer(transfer.id), "Failed to complete transfer")} className="rounded-lg p-2 text-green-700 hover:bg-green-50"><CheckCircle className="h-4 w-4" /></button>}
                      {["PENDING", "IN_TRANSIT"].includes(transfer.status) && <button disabled={saving} title="Cancel" onClick={() => void execute(() => cancelTransfer(transfer.id), "Failed to cancel transfer")} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          (() => {
            const records = filteredMovements(activeTab === "adjustments" ? adjustments : waste);
            return records.length === 0 ? <p className="p-8 text-center text-muted-foreground">No records found.</p> :
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-border bg-muted/50 text-left"><tr><th className="px-5 py-4">Item</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">{activeTab === "adjustments" ? "New quantity" : "Quantity"}</th><th className="px-5 py-4">Reason</th><th className="px-5 py-4">Date</th></tr></thead><tbody className="divide-y divide-border">{records.map((record) => <tr key={record.id}><td className="px-5 py-4 font-medium">{record.item.name}</td><td className="px-5 py-4">{record.location.name}</td><td className="px-5 py-4">{activeTab === "adjustments" ? record.newQuantity : record.quantity} {record.item.unit}</td><td className="px-5 py-4">{record.reason}</td><td className="px-5 py-4">{new Date(record.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>;
          })()
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={(event) => modal === "transfer" ? handleCreateTransfer(event) : handleCreateMovement(event, modal === "adjustment" ? "ADJUSTMENT" : wasteType)} className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">{modal === "transfer" ? "New Transfer" : modal === "adjustment" ? "Inventory Adjustment" : "Waste Log"}</h2><button type="button" onClick={() => setModal(null)}><X className="h-5 w-5" /></button></div>
            <div className="grid gap-4">
              {modal === "transfer" && (
                <>
                  <label className="text-sm">From location<select required value={fromLocationId} onChange={(event) => { setFromLocationId(event.target.value); setItemId(""); }} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2"><option value="">Select source</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                  <label className="text-sm">To location<select required value={toLocationId} onChange={(event) => setToLocationId(event.target.value)} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2"><option value="">Select destination</option>{locations.filter((location) => location.id !== fromLocationId).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                </>
              )}
              {modal === "waste" && <label className="text-sm">Waste type<select value={wasteType} onChange={(event) => setWasteType(event.target.value as "SPOILAGE" | "EXPIRY")} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2"><option value="SPOILAGE">Spoilage</option><option value="EXPIRY">Expiry</option></select></label>}
              <label className="text-sm">Inventory item<select required value={itemId} onChange={(event) => setItemId(event.target.value)} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2"><option value="">Select item</option>{(modal === "transfer" ? sourceItems : inventory).map((item) => <option key={item.id} value={item.id}>{item.name} | {item.location?.name} | stock {item.quantity}</option>)}</select></label>
              <label className="text-sm">{modal === "adjustment" ? "Set quantity to" : "Quantity"}<input required type="number" min={modal === "adjustment" ? "0" : "0.001"} step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
              <label className="text-sm">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-input bg-input-background p-2" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
