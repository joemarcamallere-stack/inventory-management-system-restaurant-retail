import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, ClipboardList, PackageMinus, ReceiptText, RotateCcw, Search, XCircle } from "lucide-react";
import { readLocalStorage, useLocalStorageState, writeLocalStorage } from "../lib/localStorage";
import { InventoryProduct } from "../lib/inventoryLogic";

type Ingredient = {
  id: string;
  productId?: number;
  productSku?: string;
  name: string;
  quantity: number;
  unit: string;
  inventoryQuantity?: number;
  inventoryUnit?: string;
  unitCost: number;
  totalCost: number;
};

type Recipe = {
  id: string;
  name: string;
  category: string;
  servings: number;
  isActive?: boolean;
  ingredients: Ingredient[];
};

type POSOrder = {
  id: string;
  receiptNo: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
  status: "completed" | "voided";
  orderedAt: string;
  completedBy: string;
  notes: string;
  voidReason?: string;
  voidedAt?: string;
};

type InventoryMovement = {
  id: string;
  type: "pos-consumption" | "pos-void";
  source: "pos-kitchen";
  sourceId: string;
  productId: number;
  item: string;
  quantity: number;
  unit: string;
  date: string;
  notes: string;
};

const normalizeName = (value: string | undefined) => (value || '').trim().toLowerCase();

export function POSKitchenOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidingOrderId, setVoidingOrderId] = useState("");
  const [excludedIngredientIds, setExcludedIngredientIds] = useState<Set<string>>(new Set());

  const [orders, setOrders] = useLocalStorageState<POSOrder[]>("pos.orders", []);
  const recipes = readLocalStorage<Recipe[]>("recipes.records", []);
  const activeRecipes = recipes.filter((recipe) => recipe.isActive ?? true);
  const inventory = readLocalStorage<InventoryProduct[]>("inventory.products", []);

  const selectedRecipe = activeRecipes.find((recipe) => recipe.id === recipeId);

  const ingredientPreview = useMemo(() => {
    const orderQty = Number(quantity) || 0;
    if (!selectedRecipe || orderQty <= 0) return [];

    return selectedRecipe.ingredients.map((ingredient) => {
      const product = inventory.find((item) =>
        ingredient.productId ? item.id === ingredient.productId : normalizeName(item.name) === normalizeName(ingredient.name)
      );
      const servingFactor = orderQty / Math.max(selectedRecipe.servings || 1, 1);
      const required = (ingredient.inventoryQuantity ?? ingredient.quantity) * servingFactor;
      const deductionUnit = ingredient.inventoryUnit || ingredient.unit;
      const unitMatches = product ? (product.unit || deductionUnit) === deductionUnit : false;

      return {
        ...ingredient,
        required,
        deductionUnit,
        product,
        unitMatches,
        hasEnoughStock: Boolean(product && unitMatches && product.stock >= required),
      };
    });
  }, [inventory, quantity, selectedRecipe]);

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return (
      (order.receiptNo || '').toLowerCase().includes(query) ||
      (order.recipeName || '').toLowerCase().includes(query) ||
      (order.status || '').toLowerCase().includes(query)
    );
  });

  const selectedIngredientPreview = ingredientPreview.filter((item) => !excludedIngredientIds.has(item.id));

  const canCompleteOrder = Boolean(
    receiptNo.trim() &&
      selectedRecipe &&
      Number(quantity) > 0 &&
      selectedIngredientPreview.length > 0 &&
      selectedIngredientPreview.every((item) => item.product && item.unitMatches && item.hasEnoughStock)
  );

  const handleRecipeChange = (nextRecipeId: string) => {
    setRecipeId(nextRecipeId);
    setExcludedIngredientIds(new Set());
  };

  const toggleIngredientIncluded = (ingredientId: string) => {
    const nextExcluded = new Set(excludedIngredientIds);
    if (nextExcluded.has(ingredientId)) {
      nextExcluded.delete(ingredientId);
    } else {
      nextExcluded.add(ingredientId);
    }
    setExcludedIngredientIds(nextExcluded);
  };

  const completeOrder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRecipe || !canCompleteOrder) return;

    const now = new Date().toISOString();
    const orderId = `POS-${Date.now()}`;
    const orderQty = Number(quantity) || 1;
    const products = readLocalStorage<InventoryProduct[]>("inventory.products", []);
    const movements = readLocalStorage<InventoryMovement[]>("inventory.movements", []);

    const nextProducts = products.map((product) => {
      const consumed = selectedIngredientPreview.find((item) => item.product?.id === product.id);
      return consumed ? { ...product, stock: product.stock - consumed.required } : product;
    });

    const nextMovements: InventoryMovement[] = selectedIngredientPreview.map((item, index) => ({
      id: `MOV-${Date.now()}-${index}`,
      type: "pos-consumption",
      source: "pos-kitchen",
      sourceId: orderId,
      productId: item.product!.id,
      item: item.product!.name,
      quantity: item.required,
      unit: item.deductionUnit,
      date: now,
      notes: `POS receipt ${receiptNo.trim()} consumed by ${selectedRecipe.name} x${orderQty}`,
    }));

    const order: POSOrder = {
      id: orderId,
      receiptNo: receiptNo.trim(),
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      quantity: orderQty,
      status: "completed",
      orderedAt: now,
      completedBy: localStorage.getItem("userEmail") || "local-user",
      notes,
    };

    writeLocalStorage("inventory.products", nextProducts);
    writeLocalStorage("inventory.movements", [...nextMovements, ...movements]);
    setOrders([order, ...orders]);
    setReceiptNo("");
    setRecipeId("");
    setExcludedIngredientIds(new Set());
    setQuantity("1");
    setNotes("");
  };

  const voidOrder = (order: POSOrder) => {
    if (!voidReason.trim()) return;

    const products = readLocalStorage<InventoryProduct[]>("inventory.products", []);
    const movements = readLocalStorage<InventoryMovement[]>("inventory.movements", []);
    const sourceMovements = movements.filter((movement) => movement.sourceId === order.id && movement.type === "pos-consumption");
    const now = new Date().toISOString();

    const nextProducts = products.map((product) => {
      const restoreQty = sourceMovements
        .filter((movement) => movement.productId === product.id)
        .reduce((sum, movement) => sum + movement.quantity, 0);
      return restoreQty > 0 ? { ...product, stock: product.stock + restoreQty } : product;
    });

    const reversalMovements: InventoryMovement[] = sourceMovements.map((movement, index) => ({
      ...movement,
      id: `MOV-VOID-${Date.now()}-${index}`,
      type: "pos-void",
      date: now,
      notes: `Void reversal for ${order.receiptNo}: ${voidReason.trim()}`,
    }));

    writeLocalStorage("inventory.products", nextProducts);
    writeLocalStorage("inventory.movements", [...reversalMovements, ...movements]);
    setOrders(orders.map((current) =>
      current.id === order.id
        ? { ...current, status: "voided", voidReason: voidReason.trim(), voidedAt: now }
        : current
    ));
    setVoidingOrderId("");
    setVoidReason("");
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">POS / Kitchen Orders</h1>
        <p className="text-sm text-muted-foreground">Record POS kitchen receipts as stock OUT using Recipe & BOM ingredient deductions.</p>
      </div>

      <div className="mb-6 rounded-xl p-4" style={{ border: "1px solid #00A7A5", backgroundColor: "#E0F7F7", color: "#005656" }}>
        <div className="flex items-center gap-2 font-semibold">
          <ReceiptText className="h-5 w-5" />
          POS orders are separate from supplier Goods Received
        </div>
        <p className="mt-2 text-sm">Use this when a kitchen receipt is completed. The system deducts ingredients from inventory and logs movement for turnover. Supplier deliveries still belong in Goods Received.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={completeOrder} className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PackageMinus className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Complete Kitchen Receipt</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-foreground">POS / Kitchen Receipt No.</label>
              <input value={receiptNo} onChange={(event) => setReceiptNo(event.target.value)} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" required />
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground">Menu Item / Recipe</label>
              <select value={recipeId} onChange={(event) => handleRecipeChange(event.target.value)} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" required>
                <option value="">Select recipe</option>
                {activeRecipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground">Quantity Ordered</label>
              <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" required />
            </div>

            <div>
              <label className="mb-1 block text-xs text-foreground">Notes</label>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border p-3">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Ingredient Deduction Preview</h3>
            {ingredientPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select a recipe to preview stock deductions.</p>
            ) : (
              <div className="space-y-2">
                {ingredientPreview.map((item) => {
                  const isIncluded = !excludedIngredientIds.has(item.id);

                  return (
                  <div key={item.id} className={`flex items-center justify-between gap-3 rounded p-2 text-sm ${isIncluded ? "bg-muted/40" : "bg-muted/20 opacity-70"}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={() => toggleIngredientIncluded(item.id)}
                        className="mt-1 h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary"
                        aria-label={`Include ${item.name} in stock deduction`}
                      />
                      <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isIncluded ? "Deduct" : "Skipped"} {item.required} {item.deductionUnit} | Stock {item.product?.stock ?? "missing"} {item.product?.unit || ""}
                      </p>
                      </div>
                    </div>
                    {!isIncluded ? (
                      <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">Skipped</span>
                    ) : item.hasEnoughStock ? (
                      <CheckCircle className="h-5 w-5" style={{ color: "#008967" }} />
                    ) : (
                      <AlertTriangle className="h-5 w-5" style={{ color: "#DC2626" }} />
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <button type="submit" disabled={!canCompleteOrder} className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
            Complete Receipt & Deduct Stock
          </button>
        </form>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Kitchen Receipt History</h2>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search receipts..." className="w-full rounded-lg border border-input bg-input-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground">Receipt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground">Recipe</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-foreground">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-sm font-medium text-primary">{order.receiptNo}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{order.recipeName}</td>
                    <td className="px-4 py-3 text-center text-sm text-foreground">{order.quantity}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium"
                        style={
                          order.status === "completed"
                            ? { borderColor: "#008967", backgroundColor: "#D1F2E8", color: "#007A5E" }
                            : { borderColor: "#FCA5A5", backgroundColor: "#FEE2E2", color: "#991B1B" }
                        }
                      >
                        {order.status === "completed" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.status === "completed" && (
                        <button type="button" onClick={() => setVoidingOrderId(order.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100">
                          <RotateCcw className="h-3 w-3" />
                          Void
                        </button>
                      )}
                      {order.status === "voided" && <span className="text-xs text-muted-foreground">{order.voidReason}</span>}
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No POS kitchen receipts yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {voidingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Void Kitchen Receipt</h2>
            <p className="mt-2 text-sm text-muted-foreground">Voiding will restore the deducted ingredients and record a reversal movement.</p>
            <textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Required void reason" className="mt-4 min-h-24 w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => { setVoidingOrderId(""); setVoidReason(""); }} className="flex-1 rounded-lg bg-muted px-4 py-3 text-sm text-foreground">Cancel</button>
              <button type="button" onClick={() => voidOrder(orders.find((order) => order.id === voidingOrderId)!)} disabled={!voidReason.trim()} className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">Void & Restore Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
