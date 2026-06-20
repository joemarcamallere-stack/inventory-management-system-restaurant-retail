import { useMemo, useState } from "react";
import { Apple, PhilippinePeso, Hash, Folder, Save, X, Calendar, Plus, FolderPlus, ShieldAlert, Check } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "../../app/hooks/useSession";
import {
  useCreateRestaurantInventoryMutation,
  useRestaurantCategoryHierarchyQuery,
  useRestaurantInventoryQuery,
  useRestaurantLocationsQuery,
  useUpdateRestaurantInventoryMutation,
  useRestaurantStorageTemperatureOptionsQuery,
  useUpsertRestaurantCategoryHierarchyMutation,
  useUpsertRestaurantStorageTemperatureOptionsMutation,
} from "../lib/restaurant";

const buildGeneratedSku = (name: string, id: number) => {
  const skuBase = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 10);
  return `${skuBase || "ITEM"}-${id}`;
};

type StoredProduct = {
  id: number;
  backendId?: string;
  locationId?: string;
  name: string;
  itemType?: string;
  sku: string;
  category: string;
  stock: number;
  maxStock: number;
  minStock?: number;
  reorderPoint?: number;
  price: number;
  expiry: string;
  location?: string;
  unit: string;
  storageTemperature?: string;
};

const normalizeName = (value: string | undefined) => (value || "").trim().toLowerCase();

const splitCategoryPath = (category: string | undefined) => {
  const [main = "", sub = ""] = (category || "").split(" > ").map((part) => part.trim());
  return { main, sub };
};

export function AddProduct({ onClose }: { onClose?: () => void } = {}) {
  const { currentUser } = useSession();
  const userRole = currentUser?.role === "Admin" ? "admin" : "staff";

  if (userRole !== "admin") {
    return (
      <div className="p-8">
        <div className="max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3 text-red-800">
            <ShieldAlert className="h-6 w-6" />
            <h1 className="text-xl font-bold">Admin Access Required</h1>
          </div>
          <p className="mt-3 text-sm text-red-700">Initial Stock Setup is restricted to admin users. To add new items to inventory, use the Purchase Orders workflow.</p>
        </div>
      </div>
    );
  }
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newMainCategory, setNewMainCategory] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("");
  const [categoryForSubCategory, setCategoryForSubCategory] = useState("");
  const [selectedExistingProduct, setSelectedExistingProduct] = useState<StoredProduct | null>(null);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    itemType: "INGREDIENT",
    sku: "",
    price: "",
    stock: "",
    minStock: "",
    maxStock: "",
    reorderPoint: "",
    expiryDate: "",
    storageTemp: "",
    unit: "",
  });

  const { data: products = [] } = useRestaurantInventoryQuery<StoredProduct[]>();
  const { data: locations = [] } = useRestaurantLocationsQuery();
  const { data: categoryHierarchy = {} } = useRestaurantCategoryHierarchyQuery();
  const { data: storageTemperatureOptions = [] } = useRestaurantStorageTemperatureOptionsQuery();
  const [newStorageTemperature, setNewStorageTemperature] = useState("");
  const createProduct = useCreateRestaurantInventoryMutation();
  const updateProduct = useUpdateRestaurantInventoryMutation();
  const saveCategoryHierarchy = useUpsertRestaurantCategoryHierarchyMutation();
  const saveStorageTemperatureOptions = useUpsertRestaurantStorageTemperatureOptionsMutation();

  const normalizedProductName = normalizeName(formData.name);
  const matchingProducts = useMemo(() => {
    if (!normalizedProductName) return [];
    return products
      .filter((product) =>
        normalizeName(product.name).includes(normalizedProductName) ||
        normalizeName(product.sku).includes(normalizedProductName)
      )
      .slice(0, 8);
  }, [normalizedProductName, products]);
  const exactProductMatch = useMemo(
    () => products.find((product) => normalizeName(product.name) === normalizedProductName),
    [normalizedProductName, products],
  );
  const productBeingUpdated = selectedExistingProduct ?? exactProductMatch ?? null;

  const createStoredProduct = async (product: StoredProduct) => {
      if (!locations[0]) throw new Error("Create a location before adding inventory");
      return createProduct.mutateAsync({
        name: product.name,
        itemType: product.itemType,
        sku: product.sku || undefined,
        category: product.category,
        quantity: product.stock,
        price: product.price,
        unit: product.unit,
        minStock: product.minStock,
        maxStock: product.maxStock,
        reorderPoint: product.reorderPoint,
        expiryDate: product.expiry ? new Date(`${product.expiry}T00:00:00`).toISOString() : undefined,
        storageTemperature: product.storageTemperature || undefined,
        locationId: locations[0].id,
      });
  };

  const updateStoredProduct = async (product: StoredProduct, addedStock: number) => {
    if (!product.backendId) throw new Error("Selected inventory item is missing its backend ID");
    const nextQuantity = (Number(product.stock) || 0) + addedStock;
    const expiryDate = formData.expiryDate
      ? new Date(`${formData.expiryDate}T00:00:00`).toISOString()
      : undefined;

    return updateProduct.mutateAsync({
      id: product.backendId,
      data: {
        name: product.name,
        itemType: product.itemType,
        sku: product.sku || undefined,
        category: product.category,
        quantity: nextQuantity,
        price: Number(formData.price) || product.price || 0,
        unit: product.unit || formData.unit || "pcs",
        minStock: formData.minStock ? Number(formData.minStock) : product.minStock,
        maxStock: formData.maxStock ? Number(formData.maxStock) : product.maxStock,
        reorderPoint: formData.reorderPoint ? Number(formData.reorderPoint) : product.reorderPoint,
        expiryDate,
        storageTemperature: formData.storageTemp || product.storageTemperature || undefined,
        locationId: product.locationId || locations[0]?.id,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextId = products.length > 0 ? Math.max(...products.map(product => product.id)) + 1 : 1;
    const stock = Number(formData.stock) || 0;
    const minStock = formData.minStock ? Number(formData.minStock) : undefined;
    const maxStock = formData.maxStock ? Number(formData.maxStock) : Math.max(stock * 2, 1);
    const reorderPoint = formData.reorderPoint ? Number(formData.reorderPoint) : undefined;
    const sku = formData.sku.trim() || buildGeneratedSku(formData.name, nextId);
    const existingProduct = productBeingUpdated;

    const productToAdd: StoredProduct = {
      id: nextId,
      name: formData.name,
      itemType: formData.itemType,
      sku,
      category: `${selectedCategory} > ${selectedSubCategory}`,
      stock,
      maxStock,
      minStock,
      reorderPoint,
      price: Number(formData.price) || 0,
      expiry: formData.expiryDate,
      location: "Unassigned",
      unit: formData.unit || "pcs",
      storageTemperature: formData.storageTemp,
    };

    try {
      if (existingProduct) {
        await updateStoredProduct(existingProduct, stock);
        toast.success(`Added ${stock} ${existingProduct.unit || formData.unit || "units"} to "${existingProduct.name}"`);
      } else {
        await createStoredProduct(productToAdd);
        toast.success(`"${productToAdd.name}" added to inventory`);
      }
      onClose?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save inventory item");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNameChange = (value: string) => {
    setFormData({
      ...formData,
      name: value,
      sku: selectedExistingProduct ? "" : formData.sku,
    });
    setSelectedExistingProduct(null);
    setShowNameSuggestions(Boolean(value.trim()));
  };

  const handleSelectExistingProduct = (product: StoredProduct) => {
    const { main, sub } = splitCategoryPath(product.category);
    setSelectedExistingProduct(product);
    setSelectedCategory(main);
    setSelectedSubCategory(sub);
    setFormData({
      ...formData,
      name: product.name,
      itemType: product.itemType || "INGREDIENT",
      sku: product.sku || "",
      price: product.price ? product.price.toString() : formData.price,
      minStock: product.minStock !== undefined ? product.minStock.toString() : "",
      maxStock: product.maxStock !== undefined ? product.maxStock.toString() : "",
      reorderPoint: product.reorderPoint !== undefined ? product.reorderPoint.toString() : "",
      expiryDate: "",
      storageTemp: product.storageTemperature || formData.storageTemp,
      unit: product.unit || formData.unit,
    });
    setShowNameSuggestions(false);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubCategory("");
  };

  const handleAddMainCategory = async () => {
    if (newMainCategory.trim()) {
      const nextHierarchy = {
        ...categoryHierarchy,
        [newMainCategory.trim()]: []
      };
      await saveCategoryHierarchy.mutateAsync(nextHierarchy);
      setNewMainCategory("");
      setShowCategoryModal(false);
    }
  };

  const handleAddSubCategory = async () => {
    if (categoryForSubCategory && newSubCategory.trim()) {
      const nextHierarchy = {
        ...categoryHierarchy,
        [categoryForSubCategory]: [
          ...(categoryHierarchy[categoryForSubCategory] || []),
          newSubCategory.trim()
        ]
      };
      await saveCategoryHierarchy.mutateAsync(nextHierarchy);
      setNewSubCategory("");
      setCategoryForSubCategory("");
      setShowCategoryModal(false);
    }
  };

  const handleAddStorageTemperature = async () => {
    const trimmed = newStorageTemperature.trim();
    if (!trimmed || storageTemperatureOptions.includes(trimmed)) return;
    const nextOptions = [...storageTemperatureOptions, trimmed];
    await saveStorageTemperatureOptions.mutateAsync(nextOptions);
    setFormData({ ...formData, storageTemp: trimmed });
    setNewStorageTemperature("");
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Initial Stock Setup</h1>
        <p className="text-muted-foreground">Add opening stock for items that entered inventory outside the standard purchase order process (e.g. opening stock, samples, donations).</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Apple className="w-5 h-5 text-primary" />
                Basic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm mb-2 text-foreground">
                    Name *
                  </label>
                  <div className="relative">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onFocus={() => setShowNameSuggestions(Boolean(formData.name.trim()))}
                      onBlur={() => setTimeout(() => setShowNameSuggestions(false), 120)}
                      onChange={(event) => handleNameChange(event.target.value)}
                      placeholder="Search or type item name"
                      autoComplete="off"
                      className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      required
                    />
                    {showNameSuggestions && (matchingProducts.length > 0 || (!exactProductMatch && formData.name.trim())) && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                        {matchingProducts.length > 0 && (
                          <div className="divide-y divide-border">
                            {matchingProducts.map((product) => (
                              <button
                                key={product.backendId || product.id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => handleSelectExistingProduct(product)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted/60"
                              >
                                <span className="min-w-0 truncate">
                                  {product.name}{product.sku ? ` (${product.sku})` : ""}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {product.stock} {product.unit}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {!exactProductMatch && formData.name.trim() && (
                          <div className="flex items-center gap-2 px-4 py-3 text-sm text-primary">
                            <Plus className="h-4 w-4" />
                            New item will be created: <span className="font-semibold">{formData.name.trim()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {productBeingUpdated && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
                      <Check className="h-4 w-4" />
                      Existing inventory item selected. Saving will add to current stock instead of creating a duplicate.
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="itemType" className="block text-sm mb-2 text-foreground">
                    Item Type *
                  </label>
                  <select
                    id="itemType"
                    name="itemType"
                    value={formData.itemType}
                    onChange={handleChange}
                    disabled={Boolean(productBeingUpdated)}
                    className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    required
                  >
                    <option value="INGREDIENT">Ingredient</option>
                    <option value="MENU_ITEM">Menu Item</option>
                    <option value="SUPPLY">Supply</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="sku" className="block text-sm mb-2 text-foreground flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    SKU <span className="text-xs text-muted-foreground font-normal">(auto-generated if blank)</span>
                  </label>
                  <input
                    id="sku"
                    name="sku"
                    type="text"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="Leave blank to auto-generate"
                    disabled={Boolean(productBeingUpdated)}
                    className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-foreground flex items-center gap-2">
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    Category *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      disabled={Boolean(productBeingUpdated)}
                      className="flex-1 px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      required={!productBeingUpdated}
                    >
                      <option value="">Select category</option>
                      {Object.keys(categoryHierarchy).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      disabled={Boolean(productBeingUpdated)}
                      className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Add Category"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedCategory && (
                  <div>
                    <label className="block text-sm mb-2 text-foreground flex items-center gap-2">
                      <Folder className="w-4 h-4 text-muted-foreground" />
                      {selectedCategory === "Meat" ? "Meat Type *" : `${selectedCategory} Type *`}
                    </label>
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => setSelectedSubCategory(e.target.value)}
                      disabled={Boolean(productBeingUpdated)}
                      className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      required={!productBeingUpdated}
                    >
                      <option value="">Select {(selectedCategory || '').toLowerCase()} type</option>
                      {categoryHierarchy[selectedCategory]?.map((subCat) => (
                        <option key={subCat} value={subCat}>
                          {subCat}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="expiryDate" className="block text-sm mb-2 text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Expiry Date *
                  </label>
                  <input
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    required={!productBeingUpdated}
                  />
                  {productBeingUpdated && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional when adding stock to an existing item. Enter a new date only if this batch should update the item expiry.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="storageTemp" className="block text-sm mb-2 text-foreground">
                    Storage Temperature
                  </label>
                  <select
                    id="storageTemp"
                    name="storageTemp"
                    value={formData.storageTemp}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select temperature</option>
                    {storageTemperatureOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newStorageTemperature}
                      onChange={(e) => setNewStorageTemperature(e.target.value)}
                      placeholder="Add storage temperature"
                      className="min-w-0 flex-1 px-3 py-2 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddStorageTemperature}
                      disabled={!newStorageTemperature.trim()}
                      className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add storage temperature"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <PhilippinePeso className="w-5 h-5" style={{ color: "#007A5E" }} />
                Pricing & Inventory
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="price" className="block text-sm mb-2 text-foreground">
                    Price (₱) *
                  </label>
                  <div className="relative">
                    <PhilippinePeso className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full pl-10 pr-2 py-3 text-sm bg-input-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="stock" className="block text-sm mb-2 text-foreground">
                    Stock Qty *
                  </label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    value={formData.stock}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="unit" className="block text-sm mb-2 text-foreground">
                    Unit *
                  </label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    disabled={Boolean(productBeingUpdated)}
                    className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    required
                  >
                    <option value="">Select unit</option>
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="liter">liter</option>
                    <option value="bottle">bottle</option>
                    <option value="pack">pack</option>
                    <option value="box">box</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="minStock" className="block text-sm mb-2 text-foreground">
                    Min Stock
                  </label>
                  <input
                    id="minStock"
                    name="minStock"
                    type="number"
                    value={formData.minStock}
                    onChange={handleChange}
                    placeholder="Critical threshold"
                    className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="maxStock" className="block text-sm mb-2 text-foreground">
                    Max Stock
                  </label>
                  <input
                    id="maxStock"
                    name="maxStock"
                    type="number"
                    value={formData.maxStock}
                    onChange={handleChange}
                    placeholder="Maximum capacity"
                    className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="reorderPoint" className="block text-sm mb-2 text-foreground">
                    Reorder Point
                  </label>
                  <input
                    id="reorderPoint"
                    name="reorderPoint"
                    type="number"
                    value={formData.reorderPoint}
                    onChange={handleChange}
                    placeholder="Low stock threshold"
                    className="w-full px-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 text-white">
              <h3 className="font-semibold text-sm mb-6">Storage Tips</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-1 flex-shrink-0"></div>
                  <span>Enter accurate expiry dates</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-1 flex-shrink-0"></div>
                  <span>Monitor temperature requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-1 flex-shrink-0"></div>
                  <span>List all allergens in description</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 text-sm rounded-2xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 font-medium flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {productBeingUpdated ? "Add Stock to Existing Item" : "Save Food Item"}
              </button>
              <button
                type="button"
                onClick={() => onClose?.()}
                className="w-full bg-muted text-foreground py-3 text-sm rounded-2xl hover:bg-muted/80 transition-all duration-200 font-medium flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                Add Food Category
              </h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewMainCategory("");
                  setNewSubCategory("");
                  setCategoryForSubCategory("");
                }}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Add Main Category */}
              <div className="bg-muted/30 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-foreground mb-2">Add Main Category</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newMainCategory}
                    onChange={(e) => setNewMainCategory(e.target.value)}
                    placeholder="e.g., Beverages"
                    className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    onClick={handleAddMainCategory}
                    disabled={!newMainCategory.trim()}
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white py-2 text-sm rounded-lg hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add Main Category
                  </button>
                </div>
              </div>

              {/* Add Subcategory */}
              <div className="bg-muted/30 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-foreground mb-2">Add Subcategory</h3>
                <div className="space-y-2">
                  <select
                    value={categoryForSubCategory}
                    onChange={(e) => setCategoryForSubCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select main category</option>
                    {Object.keys(categoryHierarchy).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    placeholder="e.g., Soft Drinks"
                    className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                    disabled={!categoryForSubCategory}
                  />
                  <button
                    onClick={handleAddSubCategory}
                    disabled={!categoryForSubCategory || !newSubCategory.trim()}
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white py-2 text-sm rounded-lg hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add Subcategory
                  </button>
                </div>
              </div>

              {/* Current Categories Preview */}
              <div className="bg-muted/30 rounded-2xl p-6 max-h-32 overflow-y-auto">
                <h3 className="text-sm font-semibold text-foreground mb-6">Current Categories</h3>
                <div className="space-y-3">
                  {Object.keys(categoryHierarchy).map((cat) => (
                    <div key={cat} className="text-sm">
                      <span className="font-medium text-foreground">{cat}</span>
                      {categoryHierarchy[cat].length > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({categoryHierarchy[cat].length} subcategories)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewMainCategory("");
                  setNewSubCategory("");
                  setCategoryForSubCategory("");
                }}
                className="w-full bg-muted text-foreground py-3 text-sm rounded-xl hover:bg-muted/80 transition-all duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
