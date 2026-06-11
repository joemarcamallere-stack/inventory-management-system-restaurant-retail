import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import {
  createCategory,
  createInventoryItem,
  getCategories,
  getLocations,
} from "../../app/api/client";
import { getStorageTemperatureOptions } from "../lib/inventoryLogic";

type Location = { id: string; name: string };
type Category = { id: string; name: string; parentId?: string; children?: Category[] };

export function AddProduct() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [form, setForm] = useState({
    name: "",
    itemType: "INGREDIENT",
    sku: "",
    categoryId: "",
    quantity: "",
    price: "",
    unit: "kg",
    minStock: "",
    maxStock: "",
    reorderPoint: "",
    expiryDate: "",
    storageTemperature: "",
    locationId: "",
  });

  useEffect(() => {
    Promise.all([getLocations(), getCategories("RESTAURANT")])
      .then(([locationData, categoryData]) => {
        setLocations(locationData);
        setCategories(categoryData);
        if (locationData[0]) setForm((current) => ({ ...current, locationId: locationData[0].id }));
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Failed to load form data"));
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const category = await createCategory({ name: newCategory.trim(), module: "RESTAURANT" });
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({ ...current, categoryId: category.id }));
      setNewCategory("");
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const category = categories.find((candidate) => candidate.id === form.categoryId);
    if (!category || !form.locationId) {
      setError("Select a category and location.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await createInventoryItem({
        name: form.name.trim(),
        itemType: form.itemType,
        sku: form.sku.trim() || undefined,
        category: category.name,
        categoryId: category.id,
        quantity: Number(form.quantity) || 0,
        price: Number(form.price) || 0,
        unit: form.unit,
        minStock: Number(form.minStock) || 0,
        maxStock: Number(form.maxStock) || Math.max(Number(form.quantity) || 0, 1),
        reorderPoint: Number(form.reorderPoint) || 0,
        expiryDate: form.expiryDate ? new Date(`${form.expiryDate}T00:00:00`).toISOString() : undefined,
        storageTemperature: form.storageTemperature || undefined,
        locationId: form.locationId,
      });
      setSuccess(true);
      setForm((current) => ({ ...current, name: "", sku: "", quantity: "", price: "", minStock: "", maxStock: "", reorderPoint: "", expiryDate: "" }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add food item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8"><h1 className="text-xl font-bold">Add Food Item</h1><p className="text-sm text-muted-foreground">Create a restaurant inventory record directly in PostgreSQL</p></div>
      {error && <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}
      {success && <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">Food item saved successfully.</div>}
      <form onSubmit={handleSubmit} className="max-w-3xl rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm md:col-span-2">Item name<input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3" /></label>
          <label className="text-sm">Item type<select value={form.itemType} onChange={(event) => setForm({ ...form, itemType: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3"><option value="INGREDIENT">Ingredient</option><option value="MENU_ITEM">Menu item</option><option value="SUPPLY">Supply</option></select></label>
          <label className="text-sm">SKU<input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3" /></label>
          <label className="text-sm">Category<select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <div className="flex items-end gap-2"><label className="flex-1 text-sm">New category<input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3" /></label><button type="button" onClick={() => void handleAddCategory()} className="rounded-xl border border-border px-4 py-3">Add</button></div>
          <label className="text-sm">Location<select required value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3"><option value="">Select location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="text-sm">Unit<input required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3" /></label>
          {(["quantity", "price", "minStock", "maxStock", "reorderPoint"] as const).map((field) => <label key={field} className="text-sm">{field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}<input type="number" min="0" step="0.001" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3" /></label>)}
          <label className="text-sm">Expiry date<input type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3" /></label>
          <label className="text-sm">Storage temperature<select value={form.storageTemperature} onChange={(event) => setForm({ ...form, storageTemperature: event.target.value })} className="mt-1 w-full rounded-xl border border-input bg-input-background p-3"><option value="">Not set</option>{getStorageTemperatureOptions().map((temperature) => <option key={temperature}>{temperature}</option>)}</select></label>
        </div>
        <button disabled={saving} className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Food Item"}</button>
      </form>
    </div>
  );
}
