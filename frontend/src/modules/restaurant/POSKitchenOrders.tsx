import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, ReceiptText, RotateCcw, Search, X } from "lucide-react";
import {
  completeKitchenOrder,
  getInventory,
  getKitchenOrders,
  getRecipes,
  voidKitchenOrder,
} from "../../app/api/client";

type InventoryItem = { id: string; name: string; quantity: number; unit?: string };
type RecipeIngredient = { id: string; itemId: string; quantity: number; unit?: string; item: InventoryItem };
type Recipe = { id: string; name: string; servings: number; isActive: boolean; sellingPrice?: number; ingredients: RecipeIngredient[] };
type KitchenOrder = { id: string; receiptNo: string; quantity: number; status: string; notes?: string; voidReason?: string; createdAt: string; recipe: Recipe; completedBy?: { email: string } };

export function POSKitchenOrders() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [voiding, setVoiding] = useState<KitchenOrder | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, recipeData, ingredientData] = await Promise.all([
        getKitchenOrders(),
        getRecipes({ active: true }),
        getInventory({ itemType: "INGREDIENT" }),
      ]);
      setOrders(orderData);
      setRecipes(recipeData);
      setInventory(ingredientData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load POS data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId);
  const ingredientPreview = useMemo(() => {
    if (!selectedRecipe) return [];
    const factor = (Number(quantity) || 0) / Math.max(selectedRecipe.servings, 1);
    return selectedRecipe.ingredients.map((ingredient) => {
      const item = inventory.find((candidate) => candidate.id === ingredient.itemId) || ingredient.item;
      const required = ingredient.quantity * factor;
      return { item, required, enough: Boolean(item && item.quantity >= required), unit: ingredient.unit || item?.unit };
    });
  }, [inventory, quantity, selectedRecipe]);
  const canComplete = Boolean(receiptNo.trim() && selectedRecipe && Number(quantity) > 0 && ingredientPreview.length > 0 && ingredientPreview.every((line) => line.enough));

  const handleComplete = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRecipe || !canComplete) return;
    setSaving(true);
    setError(null);
    try {
      await completeKitchenOrder({ receiptNo: receiptNo.trim(), recipeId: selectedRecipe.id, quantity: Number(quantity), notes: notes || undefined });
      await loadData();
      setReceiptNo(""); setRecipeId(""); setQuantity("1"); setNotes("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to complete order");
    } finally { setSaving(false); }
  };

  const handleVoid = async (event: FormEvent) => {
    event.preventDefault();
    if (!voiding || !voidReason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await voidKitchenOrder(voiding.id, voidReason.trim());
      await loadData();
      setVoiding(null); setVoidReason("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to void order");
    } finally { setSaving(false); }
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return order.receiptNo.toLowerCase().includes(query) || order.recipe.name.toLowerCase().includes(query);
  });

  return (
    <div className="p-8">
      <div className="mb-8"><h1 className="text-xl font-bold">POS / Kitchen Orders</h1><p className="text-sm text-muted-foreground">Completing an order deducts recipe ingredients transactionally</p></div>
      {error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}<button onClick={() => setError(null)} className="ml-auto underline">Dismiss</button></div>}
      <form onSubmit={handleComplete} className="mb-8 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-4"><label className="text-sm">Receipt number<input required value={receiptNo} onChange={(event) => setReceiptNo(event.target.value)} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label><label className="text-sm md:col-span-2">Recipe<select required value={recipeId} onChange={(event) => setRecipeId(event.target.value)} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2"><option value="">Select recipe</option>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label><label className="text-sm">Quantity<input required type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label></div>
        {selectedRecipe && <div className="mt-4 rounded-xl bg-muted/40 p-4"><p className="mb-2 text-sm font-medium">Ingredient availability</p><div className="grid gap-2 md:grid-cols-2">{ingredientPreview.map((line) => <div key={line.item?.id} className={`flex justify-between text-sm ${line.enough ? "text-foreground" : "text-red-700"}`}><span>{line.item?.name}</span><span>{line.required.toFixed(3)} {line.unit} / {line.item?.quantity ?? 0}</span></div>)}</div></div>}
        <label className="mt-4 block text-sm">Notes<input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
        <button disabled={!canComplete || saving} className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-white disabled:opacity-50"><CheckCircle className="h-4 w-4" />{saving ? "Completing..." : "Complete Order"}</button>
      </form>
      <div className="mb-5 relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search receipts" className="w-full rounded-xl border border-input bg-input-background py-2 pl-10 pr-3" /></div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">{loading ? <p className="p-8 text-center text-muted-foreground">Loading orders...</p> : filteredOrders.length === 0 ? <p className="p-8 text-center text-muted-foreground">No kitchen orders found.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-border bg-muted/50 text-left"><tr><th className="px-5 py-4">Receipt</th><th className="px-5 py-4">Recipe</th><th className="px-5 py-4">Quantity</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y divide-border">{filteredOrders.map((order) => <tr key={order.id}><td className="px-5 py-4 font-medium text-primary">{order.receiptNo}</td><td className="px-5 py-4">{order.recipe.name}</td><td className="px-5 py-4">{order.quantity}</td><td className="px-5 py-4">{order.status}</td><td className="px-5 py-4">{new Date(order.createdAt).toLocaleString()}</td><td className="px-5 py-4">{order.status !== "VOIDED" && <button onClick={() => setVoiding(order)} className="flex items-center gap-2 rounded-lg p-2 text-red-700 hover:bg-red-50"><RotateCcw className="h-4 w-4" />Void</button>}</td></tr>)}</tbody></table></div>}</div>
      {voiding && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={handleVoid} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"><div className="mb-4 flex justify-between"><div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-red-600" /><h2 className="text-xl font-bold">Void {voiding.receiptNo}</h2></div><button type="button" onClick={() => setVoiding(null)}><X className="h-5 w-5" /></button></div><textarea required value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Void reason" className="min-h-24 w-full rounded-xl border border-input bg-input-background p-3" /><div className="mt-4 flex justify-end gap-3"><button type="button" onClick={() => setVoiding(null)} className="rounded-xl border border-border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-xl bg-red-600 px-4 py-2 text-white">Void and Restock</button></div></form></div>}
    </div>
  );
}
