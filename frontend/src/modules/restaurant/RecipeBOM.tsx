import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChefHat, Edit, Plus, Search, Trash2, X } from "lucide-react";
import {
  createRecipe,
  deleteRecipe,
  getInventory,
  getRecipes,
  updateRecipe,
} from "../../app/api/client";

type InventoryItem = { id: string; name: string; quantity: number; price: number; costPrice?: number; unit?: string };
type RecipeIngredient = { id?: string; itemId: string; quantity: number; unit?: string; unitCost?: number; item?: InventoryItem; totalCost?: number };
type Recipe = {
  id: string;
  name: string;
  category: string;
  servings: number;
  yieldPercentage: number;
  prepTimeMinutes?: number;
  instructions?: string;
  targetFoodCost?: number;
  sellingPrice?: number;
  isActive: boolean;
  ingredients: RecipeIngredient[];
};

type DraftIngredient = { itemId: string; quantity: string; unit: string; unitCost: string };
const blankIngredient = (): DraftIngredient => ({ itemId: "", quantity: "", unit: "", unitCost: "" });

export function RecipeBOM() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Main Course", servings: "1", yieldPercentage: "100", prepTimeMinutes: "", targetFoodCost: "35", sellingPrice: "", instructions: "", isActive: true });
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([blankIngredient()]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recipeData, ingredientData] = await Promise.all([
        getRecipes(),
        getInventory({ itemType: "INGREDIENT" }),
      ]);
      setRecipes(recipeData);
      setInventory(ingredientData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load recipes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", category: "Main Course", servings: "1", yieldPercentage: "100", prepTimeMinutes: "", targetFoodCost: "35", sellingPrice: "", instructions: "", isActive: true });
    setIngredients([blankIngredient()]);
    setShowForm(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditing(recipe);
    setForm({
      name: recipe.name,
      category: recipe.category,
      servings: String(recipe.servings),
      yieldPercentage: String(recipe.yieldPercentage ?? 100),
      prepTimeMinutes: String(recipe.prepTimeMinutes ?? ""),
      targetFoodCost: String(recipe.targetFoodCost ?? ""),
      sellingPrice: String(recipe.sellingPrice ?? ""),
      instructions: recipe.instructions || "",
      isActive: recipe.isActive,
    });
    setIngredients(recipe.ingredients.map((ingredient) => ({
      itemId: ingredient.itemId,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit || ingredient.item?.unit || "",
      unitCost: String(ingredient.unitCost ?? ingredient.item?.costPrice ?? ingredient.item?.price ?? 0),
    })));
    setShowForm(true);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const validIngredients = ingredients.filter((ingredient) => ingredient.itemId && Number(ingredient.quantity) > 0);
    if (validIngredients.length === 0) {
      setError("Add at least one recipe ingredient.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      servings: Number(form.servings),
      yieldPercentage: Number(form.yieldPercentage),
      prepTimeMinutes: Number(form.prepTimeMinutes) || 0,
      targetFoodCost: Number(form.targetFoodCost) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      instructions: form.instructions,
      isActive: form.isActive,
      ingredients: validIngredients.map((ingredient) => ({
        itemId: ingredient.itemId,
        quantity: Number(ingredient.quantity),
        unit: ingredient.unit || undefined,
        unitCost: Number(ingredient.unitCost) || 0,
      })),
    };
    setSaving(true);
    setError(null);
    try {
      if (editing) await updateRecipe(editing.id, payload);
      else await createRecipe(payload);
      await loadData();
      setShowForm(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save recipe");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recipe: Recipe) => {
    if (!window.confirm(`Delete ${recipe.name}?`)) return;
    try {
      await deleteRecipe(recipe.id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete recipe");
    }
  };

  const filteredRecipes = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return recipes.filter((recipe) => recipe.name.toLowerCase().includes(query) || recipe.category.toLowerCase().includes(query));
  }, [recipes, searchQuery]);

  const recipeCost = (recipe: Recipe) =>
    recipe.ingredients.reduce((sum, ingredient) => sum + (ingredient.totalCost ?? (ingredient.unitCost ?? ingredient.item?.price ?? 0) * ingredient.quantity), 0);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between"><div><h1 className="text-xl font-bold">Recipe & BOM</h1><p className="text-sm text-muted-foreground">Backend recipe definitions linked to ingredient UUIDs</p></div><button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-white"><Plus className="h-4 w-4" />New Recipe</button></div>
      {error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}<button onClick={() => setError(null)} className="ml-auto underline">Dismiss</button></div>}
      <div className="mb-6 relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search recipes" className="w-full rounded-xl border border-input bg-input-background py-2 pl-10 pr-3" /></div>
      {loading ? <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Loading recipes...</p> : filteredRecipes.length === 0 ? <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">No recipes found.</p> :
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{filteredRecipes.map((recipe) => {
        const cost = recipeCost(recipe);
        return <div key={recipe.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between"><div className="flex gap-3"><ChefHat className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">{recipe.name}</h2><p className="text-sm text-muted-foreground">{recipe.category} | {recipe.servings} servings</p></div></div><div className="flex gap-1"><button onClick={() => openEdit(recipe)} className="rounded-lg p-2 hover:bg-muted"><Edit className="h-4 w-4" /></button><button onClick={() => void handleDelete(recipe)} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-4 space-y-2">{recipe.ingredients.map((ingredient) => <div key={ingredient.id || ingredient.itemId} className="flex justify-between text-sm"><span>{ingredient.item?.name || "Ingredient"}</span><span>{ingredient.quantity} {ingredient.unit || ingredient.item?.unit}</span></div>)}</div><div className="mt-4 flex justify-between border-t border-border pt-4 text-sm"><span>Recipe cost: PHP {cost.toFixed(2)}</span><span>Selling: PHP {(recipe.sellingPrice || 0).toFixed(2)}</span></div></div>;
      })}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={handleSave} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl"><div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">{editing ? "Edit Recipe" : "New Recipe"}</h2><button type="button" onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button></div><div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
          <label className="text-sm">Category<input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
          <label className="text-sm">Servings<input required type="number" min="1" value={form.servings} onChange={(event) => setForm({ ...form, servings: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
          <label className="text-sm">Yield percentage<input type="number" min="1" value={form.yieldPercentage} onChange={(event) => setForm({ ...form, yieldPercentage: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
          <label className="text-sm">Selling price<input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
          <label className="text-sm">Prep minutes<input type="number" min="0" value={form.prepTimeMinutes} onChange={(event) => setForm({ ...form, prepTimeMinutes: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-2" /></label>
        </div><div className="mt-5 space-y-3"><p className="font-medium">Ingredients</p>{ingredients.map((ingredient, index) => <div key={index} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-[1fr_100px_100px_120px_auto]"><select required value={ingredient.itemId} onChange={(event) => { const item = inventory.find((candidate) => candidate.id === event.target.value); setIngredients((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, itemId: event.target.value, unit: item?.unit || "", unitCost: String(item?.costPrice ?? item?.price ?? 0) } : line)); }} className="rounded-lg border border-input bg-input-background p-2 text-sm"><option value="">Select ingredient</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} | stock {item.quantity}</option>)}</select><input required type="number" min="0.001" step="0.001" placeholder="Qty" value={ingredient.quantity} onChange={(event) => setIngredients((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: event.target.value } : line))} className="rounded-lg border border-input bg-input-background p-2 text-sm" /><input placeholder="Unit" value={ingredient.unit} onChange={(event) => setIngredients((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, unit: event.target.value } : line))} className="rounded-lg border border-input bg-input-background p-2 text-sm" /><input type="number" min="0" step="0.01" placeholder="Unit cost" value={ingredient.unitCost} onChange={(event) => setIngredients((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, unitCost: event.target.value } : line))} className="rounded-lg border border-input bg-input-background p-2 text-sm" /><button type="button" disabled={ingredients.length === 1} onClick={() => setIngredients((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="p-2 text-red-700 disabled:opacity-30"><X className="h-4 w-4" /></button></div>)}<button type="button" onClick={() => setIngredients((current) => [...current, blankIngredient()])} className="flex items-center gap-2 text-sm text-primary"><Plus className="h-4 w-4" />Add ingredient</button></div><label className="mt-5 block text-sm">Instructions<textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-input bg-input-background p-3" /></label><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-white">{saving ? "Saving..." : "Save Recipe"}</button></div></form></div>
      )}
    </div>
  );
}
