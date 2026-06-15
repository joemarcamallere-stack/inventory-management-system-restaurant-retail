import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, ClipboardList, PackageMinus, ReceiptText, RotateCcw, Search, XCircle } from "lucide-react";
import { completeKitchenOrder, voidKitchenOrder } from "../../app/api/client";
import { InventoryProduct } from "../lib/inventoryLogic";
import { domainQueryKeys, useDomainMutation } from "../lib/domainQueries";
import {
  useRestaurantInventoryQuery,
  useRestaurantKitchenOrdersQuery,
  useRestaurantRecipesQuery,
} from "../lib/restaurantQueries";

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
  status: "pending" | "preparing" | "ready" | "completed" | "voided";
  orderedAt: string;
  completedBy: string;
  notes: string;
  voidReason?: string;
  voidedAt?: string;
};

const normalizeName = (value: string | undefined) => (value || '').trim().toLowerCase();

const reportSyncError = (error: unknown) => {
  window.dispatchEvent(
    new CustomEvent("restaurant-sync-error", {
      detail: {
        key: "pos.orders",
        message: error instanceof Error ? error.message : String(error),
      },
    }),
  );
};

export function POSKitchenOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidingOrderId, setVoidingOrderId] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);

  const ordersQuery = useRestaurantKitchenOrdersQuery();
  const orders = (ordersQuery.data ?? []) as POSOrder[];
  const inventoryQuery = useRestaurantInventoryQuery<(InventoryProduct & { backendId?: string })[]>();
  const inventory = inventoryQuery.data ?? [];
  const recipesQuery = useRestaurantRecipesQuery();
  const recipes = (recipesQuery.data ?? []).map((recipe: any) => ({
    ...recipe,
    ingredients: (recipe.ingredients ?? []).map((ingredient: any) => ({
      ...ingredient,
      productId: inventory.find((item) => item.backendId === ingredient.backendItemId)?.id,
    })),
  })) as Recipe[];
  const activeRecipes = recipes.filter((recipe) => recipe.isActive ?? true);
  const completeOrderMutation = useDomainMutation(
    (data: unknown) => completeKitchenOrder(data),
    [domainQueryKeys.kitchenOrders, domainQueryKeys.inventory, domainQueryKeys.stockMovements],
  );
  const voidOrderMutation = useDomainMutation(
    ({ id, reason }: { id: string; reason: string }) => voidKitchenOrder(id, reason),
    [domainQueryKeys.kitchenOrders, domainQueryKeys.inventory, domainQueryKeys.stockMovements],
  );

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

  const canCompleteOrder = Boolean(
    receiptNo.trim() &&
      selectedRecipe &&
      Number(quantity) > 0 &&
      ingredientPreview.length > 0 &&
      ingredientPreview.every((item) => item.product && item.unitMatches && item.hasEnoughStock)
  );

  const handleRecipeChange = (nextRecipeId: string) => {
    setRecipeId(nextRecipeId);
  };

  const completeOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRecipe || !canCompleteOrder || isCompleting) return;

    const orderQty = Number(quantity) || 1;

    setIsCompleting(true);
    try {
      await completeOrderMutation.mutateAsync({
        receiptNo: receiptNo.trim(),
        recipeId: selectedRecipe.id,
        quantity: orderQty,
        notes,
      });
      setReceiptNo("");
      setRecipeId("");
      setQuantity("1");
      setNotes("");
    } catch (error) {
      reportSyncError(error);
    } finally {
      setIsCompleting(false);
    }
  };

  const voidOrder = async (order: POSOrder) => {
    if (!voidReason.trim() || isVoiding) return;

    setIsVoiding(true);
    try {
      await voidOrderMutation.mutateAsync({ id: order.id, reason: voidReason.trim() });
      setVoidingOrderId("");
      setVoidReason("");
    } catch (error) {
      reportSyncError(error);
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">POS / Kitchen Orders</h1>
        <p className="text-muted-foreground">Record kitchen receipts and deduct ingredients from inventory via Recipe &amp; BOM.</p>
      </div>

      <div className="mb-6 rounded-xl border border-accent/50 bg-accent/10 p-4 text-primary">
        <div className="flex items-center gap-2 font-semibold mb-1">
          <ReceiptText className="h-5 w-5" />
          Separate from Goods Received
        </div>
        <p className="text-sm opacity-80">Use this for completed kitchen receipts. Ingredients are auto-deducted based on Recipe &amp; BOM. Supplier deliveries belong in Goods Received.</p>
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
                  return (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded bg-muted/40 p-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Deduct {item.required} {item.deductionUnit} | Stock {item.product?.stock ?? "missing"} {item.product?.unit || ""}
                      </p>
                    </div>
                    {item.hasEnoughStock ? (
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

          <button type="submit" disabled={!canCompleteOrder || isCompleting} className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
            {isCompleting ? "Completing..." : "Complete Receipt"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Void Kitchen Receipt</h2>
            <p className="mt-2 text-sm text-muted-foreground">Voiding will restore the deducted ingredients and record a reversal movement.</p>
            <textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Required void reason" className="mt-4 min-h-24 w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => { setVoidingOrderId(""); setVoidReason(""); }} className="flex-1 rounded-lg bg-muted px-4 py-3 text-sm text-foreground">Cancel</button>
              <button type="button" onClick={() => voidOrder(orders.find((order) => order.id === voidingOrderId)!)} disabled={!voidReason.trim() || isVoiding} className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
                {isVoiding ? "Voiding..." : "Void & Restore Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
