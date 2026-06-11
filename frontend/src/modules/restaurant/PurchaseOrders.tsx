import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Plus,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  createSupplier,
  getInventory,
  getPurchaseOrders,
  getSuppliers,
  rejectPurchaseOrder,
  submitPurchaseOrder,
} from "../../app/api/client";

type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
};

type InventoryItem = {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  unit?: string;
};

type PurchaseOrderItem = {
  id: string;
  inventoryItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  inventoryItem?: InventoryItem;
};

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  status: string;
  notes?: string;
  expectedDelivery?: string;
  totalAmount: number;
  supplier?: Supplier;
  items: PurchaseOrderItem[];
  createdBy?: { name: string };
  rejectionReason?: string;
  createdAt: string;
};

type DraftLine = {
  inventoryItemId: string;
  quantity: string;
  unitPrice: string;
};

const blankLine = (): DraftLine => ({
  inventoryItemId: "",
  quantity: "",
  unitPrice: "",
});

const statusLabel = (status: string) =>
  status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const statusClass = (status: string) => {
  if (status === "RECEIVED") return "bg-green-100 text-green-700 border-green-200";
  if (status === "APPROVED" || status === "PARTIALLY_RECEIVED") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  return "bg-yellow-100 text-yellow-700 border-yellow-200";
};

export function PurchaseOrders({ currentUserRole }: { currentUserRole: string }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showSuppliersListModal, setShowSuppliersListModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<PurchaseOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([blankLine()]);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
  });

  const userRole = currentUserRole.toLowerCase();
  const canApprove = userRole === "admin" || userRole === "manager";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, supplierData, ingredients, menuItems, supplies] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers({ isActive: true }),
        getInventory({ itemType: "INGREDIENT" }),
        getInventory({ itemType: "MENU_ITEM" }),
        getInventory({ itemType: "SUPPLY" }),
      ]);
      setOrders(orderData);
      setSuppliers(supplierData);
      setInventory([...ingredients, ...menuItems, ...supplies]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesQuery =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        (order.supplier?.name || "").toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  };

  const resetOrderForm = () => {
    setSupplierId("");
    setExpectedDelivery("");
    setNotes("");
    setLines([blankLine()]);
  };

  const handleCreateOrder = async (event: FormEvent) => {
    event.preventDefault();
    const validLines = lines.filter(
      (line) =>
        line.inventoryItemId &&
        Number(line.quantity) > 0 &&
        Number(line.unitPrice) >= 0,
    );
    if (!supplierId || validLines.length === 0) {
      setError("Select a supplier and add at least one valid item.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createPurchaseOrder({
        supplierId,
        expectedDelivery: expectedDelivery
          ? new Date(`${expectedDelivery}T00:00:00`).toISOString()
          : undefined,
        notes: notes || undefined,
        items: validLines.map((line) => {
          const item = inventory.find(
            (candidate) => candidate.id === line.inventoryItemId,
          )!;
          return {
            inventoryItemId: item.id,
            name: item.name,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
          };
        }),
      });
      await submitPurchaseOrder(created.id);
      await loadData();
      resetOrderForm();
      setShowCreateModal(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  const runOrderAction = async (
    action: () => Promise<unknown>,
    fallbackMessage: string,
  ) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : fallbackMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (event: FormEvent) => {
    event.preventDefault();
    if (!rejectingOrder || !rejectionReason.trim()) return;
    await runOrderAction(
      () => rejectPurchaseOrder(rejectingOrder.id, rejectionReason.trim()),
      "Failed to reject purchase order",
    );
    setRejectingOrder(null);
    setRejectionReason("");
  };

  const handleAddSupplier = async (event: FormEvent) => {
    event.preventDefault();
    if (!newSupplier.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await createSupplier({
        name: newSupplier.name.trim(),
        contactPerson: newSupplier.contactPerson.trim() || undefined,
        email: newSupplier.email.trim() || undefined,
        phone: newSupplier.phone.trim() || undefined,
        address: newSupplier.address.trim() || undefined,
      });
      setSuppliers((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierId(saved.id);
      setNewSupplier({ name: "", contactPerson: "", email: "", phone: "", address: "" });
      setShowSupplierModal(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add supplier");
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: "Total Orders", value: orders.length },
    { label: "Pending Approval", value: orders.filter((order) => order.status === "SUBMITTED").length },
    { label: "Approved", value: orders.filter((order) => ["APPROVED", "PARTIALLY_RECEIVED"].includes(order.status)).length },
    { label: "Received", value: orders.filter((order) => order.status === "RECEIVED").length },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Backend-managed supplier purchasing and approvals</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowSuppliersListModal(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm"
          >
            <Users className="h-4 w-4" /> Suppliers
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-white"
          >
            <Plus className="h-4 w-4" /> Create Order
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <button className="ml-auto underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search order number or supplier"
            className="w-full rounded-xl border border-input bg-input-background py-2 pl-10 pr-3"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-input bg-input-background py-2 pl-10 pr-8"
          >
            <option value="all">All statuses</option>
            {["DRAFT", "SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "REJECTED", "CANCELLED"].map((status) => (
              <option key={status} value={status}>{statusLabel(status)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">Loading purchase orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No purchase orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50 text-left text-sm">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Supplier</th>
                  <th className="px-5 py-4">Items</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-primary">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-4">{order.supplier?.name || "No supplier"}</td>
                    <td className="px-5 py-4">{order.items.length}</td>
                    <td className="px-5 py-4 font-medium">PHP {order.totalAmount.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedOrder(order)} className="rounded-lg p-2 hover:bg-muted" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {canApprove && order.status === "SUBMITTED" && (
                          <>
                            <button
                              disabled={saving}
                              onClick={() => void runOrderAction(() => approvePurchaseOrder(order.id), "Failed to approve order")}
                              className="rounded-lg p-2 text-green-700 hover:bg-green-50"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              disabled={saving}
                              onClick={() => setRejectingOrder(order)}
                              className="rounded-lg p-2 text-red-700 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {["DRAFT", "SUBMITTED", "APPROVED"].includes(order.status) && (
                          <button
                            disabled={saving}
                            onClick={() => void runOrderAction(() => cancelPurchaseOrder(order.id), "Failed to cancel order")}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleCreateOrder} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Create Purchase Order</h2>
              <button type="button" onClick={() => setShowCreateModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block">Supplier</span>
                <div className="flex gap-2">
                  <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="min-w-0 flex-1 rounded-xl border border-input bg-input-background p-2">
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowSupplierModal(true)} className="rounded-xl border border-border px-3"><Plus className="h-4 w-4" /></button>
                </div>
              </label>
              <label className="text-sm">
                <span className="mb-1 block">Expected delivery</span>
                <input type="date" value={expectedDelivery} onChange={(event) => setExpectedDelivery(event.target.value)} className="w-full rounded-xl border border-input bg-input-background p-2" />
              </label>
            </div>
            <div className="mt-5 space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-[1fr_120px_140px_auto]">
                  <select value={line.inventoryItemId} onChange={(event) => updateLine(index, { inventoryItemId: event.target.value })} required className="rounded-lg border border-input bg-input-background p-2 text-sm">
                    <option value="">Select inventory item</option>
                    {inventory.map((item) => <option key={item.id} value={item.id}>{item.name}{item.sku ? ` (${item.sku})` : ""}</option>)}
                  </select>
                  <input type="number" min="0.001" step="0.001" placeholder="Quantity" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} required className="rounded-lg border border-input bg-input-background p-2 text-sm" />
                  <input type="number" min="0" step="0.01" placeholder="Unit price" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} required className="rounded-lg border border-input bg-input-background p-2 text-sm" />
                  <button type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="rounded-lg px-2 text-red-600 disabled:opacity-30"><X className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setLines((current) => [...current, blankLine()])} className="flex items-center gap-2 text-sm text-primary"><Plus className="h-4 w-4" /> Add item</button>
            </div>
            <label className="mt-5 block text-sm">
              <span className="mb-1 block">Notes</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 w-full rounded-xl border border-input bg-input-background p-3" />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl border border-border px-4 py-2">Cancel</button>
              <button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving..." : "Create and Submit"}</button>
            </div>
          </form>
        </div>
      )}

      {showSupplierModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleAddSupplier} className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">Add Supplier</h2><button type="button" onClick={() => setShowSupplierModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="grid gap-3">
              {([
                ["name", "Supplier name"],
                ["contactPerson", "Contact person"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["address", "Address"],
              ] as const).map(([field, label]) => (
                <input key={field} type={field === "email" ? "email" : "text"} required={field === "name"} placeholder={label} value={newSupplier[field]} onChange={(event) => setNewSupplier((current) => ({ ...current, [field]: event.target.value }))} className="rounded-xl border border-input bg-input-background p-3" />
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowSupplierModal(false)} className="rounded-xl border border-border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-white">Save Supplier</button></div>
          </form>
        </div>
      )}

      {showSuppliersListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">Suppliers</h2><button onClick={() => setShowSuppliersListModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="space-y-3">
              {suppliers.length === 0 ? <p className="text-muted-foreground">No suppliers found.</p> : suppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-xl border border-border p-4">
                  <p className="font-semibold">{supplier.name}</p>
                  <p className="text-sm text-muted-foreground">{supplier.contactPerson || "No contact"}{supplier.email ? ` | ${supplier.email}` : ""}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-5 flex justify-between"><div><h2 className="text-xl font-bold">{selectedOrder.orderNumber}</h2><p className="text-sm text-muted-foreground">{selectedOrder.supplier?.name}</p></div><button onClick={() => setSelectedOrder(null)}><X className="h-5 w-5" /></button></div>
            <div className="space-y-3">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between rounded-xl border border-border p-4">
                  <div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">{item.quantity} {item.inventoryItem?.unit || "units"} x PHP {item.unitPrice.toFixed(2)}</p></div>
                  <p className="font-semibold">PHP {item.totalPrice.toFixed(2)}</p>
                </div>
              ))}
            </div>
            {selectedOrder.rejectionReason && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Rejection: {selectedOrder.rejectionReason}</p>}
          </div>
        </div>
      )}

      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleReject} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3"><Clock className="h-5 w-5 text-red-600" /><h2 className="text-xl font-bold">Reject {rejectingOrder.orderNumber}</h2></div>
            <textarea required value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Reason for rejection" className="min-h-28 w-full rounded-xl border border-input bg-input-background p-3" />
            <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={() => setRejectingOrder(null)} className="rounded-xl border border-border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-xl bg-red-600 px-4 py-2 text-white">Reject Order</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
