import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Link2, Merge, PackageSearch, Save, ShieldAlert } from "lucide-react";
import { readRestaurantData, useRestaurantState, writeRestaurantData } from "../lib/restaurantData";
import { defaultCategoryHierarchy, InventoryProduct } from "../lib/inventoryLogic";

type GlobalProduct = {
  id: string;
  inventoryId?: number;
  sku?: string;
  name: string;
  category?: string;
  subCategory?: string;
  unit?: string;
};

type Supplier = {
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  products: Array<{ name: string; price: number }>;
};

type OrderItem = {
  productId?: string;
  productName: string;
  category: string;
  subCategory: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

type PurchaseOrder = {
  id: string;
  orderItems: OrderItem[];
};

type GoodsRecord = {
  id: string;
  receivedItems?: Array<OrderItem & { condition: string }>;
};

type CatalogProduct = {
  key: string;
  name: string;
  category: string;
  subCategory: string;
  unit: string;
  inventoryIds: number[];
  globalIds: string[];
  stock: number;
  maxStock: number;
  minStock: number;
  reorderPoint: number;
  supplierNames: string[];
};

const units = ["kg", "g", "pcs", "liter", "bottle", "pack", "box", "dozen"];
const normalizeName = (value: string | undefined) => (value || '').trim().toLowerCase();

function splitCategory(value?: string) {
  const [category = "", subCategory = ""] = (value || "").split(" > ");
  return { category, subCategory };
}

function joinCategory(category: string, subCategory: string) {
  return subCategory ? `${category} > ${subCategory}` : category;
}

export function ProductManagement() {
  const userRole = typeof window !== "undefined" ? localStorage.getItem("userRole") || "staff" : "staff";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [mergeKey, setMergeKey] = useState<string>("");
  const [products, setProducts] = useRestaurantState<InventoryProduct[]>("inventory.products", []);
  const [globalProducts, setGlobalProducts] = useRestaurantState<GlobalProduct[]>("purchaseOrders.globalProducts", []);
  const [suppliers, setSuppliers] = useRestaurantState<Supplier[]>("purchaseOrders.suppliers", []);
  const [form, setForm] = useState({
    name: "",
    category: "",
    subCategory: "",
    unit: "",
    maxStock: "0",
    minStock: "0",
    reorderPoint: "0",
  });
  const [supplierPrices, setSupplierPrices] = useState<Record<string, string>>({});

  const catalog = useMemo<CatalogProduct[]>(() => {
    const grouped = new Map<string, CatalogProduct>();

    products.forEach((product) => {
      const key = normalizeName(product.name);
      const categoryParts = splitCategory(product.category);
      const linkedGlobalIds = globalProducts
        .filter((globalProduct) => globalProduct.inventoryId === product.id)
        .map((globalProduct) => globalProduct.id);
      const current = grouped.get(key) || {
        key,
        name: product.name,
        category: categoryParts.category,
        subCategory: categoryParts.subCategory,
        unit: product.unit || "pcs",
        inventoryIds: [],
        globalIds: linkedGlobalIds,
        stock: 0,
        maxStock: product.maxStock || 0,
        minStock: product.minStock ?? Math.ceil((product.maxStock || 0) * 0.25),
        reorderPoint: product.reorderPoint ?? Math.ceil((product.maxStock || 0) * 0.3),
        supplierNames: [],
      };
      current.inventoryIds.push(product.id);
      linkedGlobalIds.forEach((id) => {
        if (!current.globalIds.includes(id)) current.globalIds.push(id);
      });
      current.stock += product.stock || 0;
      current.maxStock = Math.max(current.maxStock, product.maxStock || 0);
      grouped.set(key, current);
    });

    suppliers.forEach((supplier) => {
      supplier.products.forEach((product) => {
        const current = grouped.get(normalizeName(product.name));
        if (current && !current.supplierNames.includes(supplier.name)) {
          current.supplierNames.push(supplier.name);
        }
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, globalProducts, suppliers]);

  const selectedProduct = catalog.find((product) => product.key === selectedKey);
  const categoryOptions = Object.keys(defaultCategoryHierarchy);
  const subCategoryOptions = form.category ? defaultCategoryHierarchy[form.category] || [] : [];

  const filteredCatalog = catalog.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      (product.name || '').toLowerCase().includes(query) ||
      (product.category || '').toLowerCase().includes(query) ||
      product.supplierNames.some((supplier) => (supplier || '').toLowerCase().includes(query))
    );
  });

  const openProduct = (product: CatalogProduct) => {
    setSelectedKey(product.key);
    setMergeKey("");
    setForm({
      name: product.name,
      category: product.category,
      subCategory: product.subCategory,
      unit: product.unit || "pcs",
      maxStock: String(product.maxStock || 0),
      minStock: String(product.minStock || 0),
      reorderPoint: String(product.reorderPoint || 0),
    });

    const nextSupplierPrices: Record<string, string> = {};
    suppliers.forEach((supplier) => {
      const linked = supplier.products.find((item) => normalizeName(item.name) === product.key);
      if (linked) nextSupplierPrices[supplier.name] = String(linked.price);
    });
    setSupplierPrices(nextSupplierPrices);
  };

  const updateLinkedRecords = (oldNames: string[], nextProduct: { name: string; category: string; subCategory: string; unit: string }, oldGlobalIds: string[] = []) => {
    const oldNameSet = new Set(oldNames.map(normalizeName));
    const oldIdSet = new Set(oldGlobalIds);

    const purchaseOrders = readRestaurantData<PurchaseOrder[]>("purchaseOrders.orders", []);
    writeRestaurantData(
      "purchaseOrders.orders",
      purchaseOrders.map((order) => ({
        ...order,
        orderItems: order.orderItems.map((item) =>
          item.productId && oldIdSet.has(item.productId)
            ? { ...item, productName: nextProduct.name, category: nextProduct.category, subCategory: nextProduct.subCategory, unit: nextProduct.unit }
            : item
        ),
      }))
    );

    const goodsRecords = readRestaurantData<GoodsRecord[]>("goodsReceived.records", []);
    writeRestaurantData(
      "goodsReceived.records",
      goodsRecords.map((record) => ({
        ...record,
        receivedItems: record.receivedItems?.map((item) =>
          oldNameSet.has(normalizeName(item.productName)) || (item.productId && oldIdSet.has(item.productId))
            ? { ...item, productName: nextProduct.name, category: nextProduct.category, subCategory: nextProduct.subCategory, unit: nextProduct.unit }
            : item
        ),
      }))
    );
  };

  const saveProduct = () => {
    if (!selectedProduct || !form.name.trim() || !form.category.trim() || !form.unit.trim()) return;

    const next = {
      name: form.name.trim(),
      category: form.category,
      subCategory: form.subCategory,
      unit: form.unit,
      fullCategory: joinCategory(form.category, form.subCategory),
      maxStock: Number(form.maxStock) || 0,
      minStock: Number(form.minStock) || 0,
      reorderPoint: Number(form.reorderPoint) || 0,
    };

    const oldNames = [selectedProduct.name];
    const oldGlobalIds = selectedProduct.globalIds;

    setProducts(
      products.map((product) =>
        selectedProduct.inventoryIds.includes(product.id) || normalizeName(product.name) === selectedProduct.key
          ? { ...product, name: next.name, category: next.fullCategory, unit: next.unit, maxStock: next.maxStock, minStock: next.minStock, reorderPoint: next.reorderPoint }
          : product
      )
    );

    setGlobalProducts(
      globalProducts.map((product) =>
        selectedProduct.globalIds.includes(product.id) || (product.inventoryId !== undefined && selectedProduct.inventoryIds.includes(product.inventoryId))
          ? { ...product, name: next.name, category: next.category, subCategory: next.subCategory, unit: next.unit }
          : product
      )
    );

    setSuppliers(
      suppliers.map((supplier) => {
        const price = supplierPrices[supplier.name];
        const isLinked = price !== undefined && price !== "";
        const others = supplier.products.filter((item) => normalizeName(item.name) !== selectedProduct.key);
        return {
          ...supplier,
          products: isLinked ? [...others, { name: next.name, price: Number(price) || 0 }] : others,
        };
      })
    );

    updateLinkedRecords(oldNames, next, oldGlobalIds);
    setSelectedKey(normalizeName(next.name));
  };

  const mergeDuplicate = () => {
    if (!selectedProduct || !mergeKey || mergeKey === selectedProduct.key) return;
    const duplicate = catalog.find((product) => product.key === mergeKey);
    if (!duplicate) return;

    const next = {
      name: selectedProduct.name,
      category: selectedProduct.category,
      subCategory: selectedProduct.subCategory,
      unit: selectedProduct.unit,
      fullCategory: joinCategory(selectedProduct.category, selectedProduct.subCategory),
    };

    const duplicateInventoryItems = products.filter((product) => duplicate.inventoryIds.includes(product.id) || normalizeName(product.name) === duplicate.key);
    const duplicateStock = duplicateInventoryItems.reduce((sum, product) => sum + product.stock, 0);
    const existingPrimaryInventoryId = selectedProduct.inventoryIds[0];
    const primaryInventoryId = existingPrimaryInventoryId ?? duplicateInventoryItems[0]?.id;

    setProducts(
      products
        .filter((product) => product.id === primaryInventoryId || !(duplicate.inventoryIds.includes(product.id) || normalizeName(product.name) === duplicate.key))
        .map((product) =>
          product.id === primaryInventoryId || normalizeName(product.name) === selectedProduct.key
            ? { ...product, name: next.name, category: next.fullCategory, unit: next.unit, stock: product.id === primaryInventoryId ? (existingPrimaryInventoryId ? product.stock + duplicateStock : duplicateStock) : product.stock }
            : product
        )
    );

    setGlobalProducts(
      globalProducts
        .filter((product) => !(duplicate.globalIds.includes(product.id) || (product.inventoryId !== undefined && duplicate.inventoryIds.includes(product.inventoryId))))
        .map((product) =>
          selectedProduct.globalIds.includes(product.id) || (product.inventoryId !== undefined && selectedProduct.inventoryIds.includes(product.inventoryId))
            ? { ...product, name: next.name, category: next.category, subCategory: next.subCategory, unit: next.unit }
            : product
        )
    );

    setSuppliers(
      suppliers.map((supplier) => {
        const primary = supplier.products.find((item) => normalizeName(item.name) === selectedProduct.key);
        const duplicateLink = supplier.products.find((item) => normalizeName(item.name) === duplicate.key);
        const others = supplier.products.filter((item) => normalizeName(item.name) !== selectedProduct.key && normalizeName(item.name) !== duplicate.key);
        const linked = primary || duplicateLink;
        return {
          ...supplier,
          products: linked ? [...others, { name: next.name, price: linked.price }] : others,
        };
      })
    );

    updateLinkedRecords([duplicate.name], next, duplicate.globalIds);
    setMergeKey("");
  };

  if (userRole !== "admin") {
    return (
      <div className="p-8">
        <div className="max-w-2xl rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3 text-red-800">
            <ShieldAlert className="h-6 w-6" />
            <h1 className="text-xl font-bold">Admin Access Required</h1>
          </div>
          <p className="mt-3 text-sm text-red-700">Product Management is restricted to admin users because changes affect linked PO and inventory records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Management</h1>
          <p className="text-sm text-muted-foreground">Admin maintenance for products that already passed receiving/QC and exist in inventory.</p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-5 w-5" />
          Changes affect received inventory records
        </div>
        <p className="mt-2 text-sm">Products still waiting for receiving or quality check are kept out of this list. Use this only to fix accepted inventory items, merge duplicates, assign suppliers, and set reorder levels.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Product Master List</h2>
          </div>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products, categories, suppliers..."
            className="mb-4 w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="max-h-[620px] space-y-2 overflow-y-auto">
            {filteredCatalog.map((product) => (
              <button
                key={product.key}
                type="button"
                onClick={() => openProduct(product)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedKey === product.key ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{product.name}</p>
                  <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{product.stock} {product.unit}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{joinCategory(product.category, product.subCategory) || "Uncategorized"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{product.supplierNames.length} supplier link{product.supplierNames.length === 1 ? "" : "s"}</p>
              </button>
            ))}
            {filteredCatalog.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No product records found</div>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          {!selectedProduct ? (
            <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">Select a product to manage its master data</div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{selectedProduct.name}</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-foreground">Product Name</label>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground">Unit</label>
                  <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary">
                    {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground">Category</label>
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value, subCategory: "" })} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary">
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground">Subcategory</label>
                  <select value={form.subCategory} onChange={(event) => setForm({ ...form, subCategory: event.target.value })} disabled={!form.category} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50">
                    <option value="">Select subcategory</option>
                    {subCategoryOptions.map((subCategory) => <option key={subCategory} value={subCategory}>{subCategory}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-foreground">Max Stock</label>
                  <input type="number" value={form.maxStock} onChange={(event) => setForm({ ...form, maxStock: event.target.value })} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground">Minimum Stock</label>
                  <input type="number" value={form.minStock} onChange={(event) => setForm({ ...form, minStock: event.target.value })} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground">Reorder Point</label>
                  <input type="number" value={form.reorderPoint} onChange={(event) => setForm({ ...form, reorderPoint: event.target.value })} className="w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Supplier Relationships</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {suppliers.map((supplier) => {
                    const linked = supplierPrices[supplier.name] !== undefined;
                    return (
                      <div key={supplier.name} className="rounded-lg border border-border p-3">
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={linked}
                            onChange={(event) => {
                              const next = { ...supplierPrices };
                              if (event.target.checked) next[supplier.name] = next[supplier.name] || "0";
                              else delete next[supplier.name];
                              setSupplierPrices(next);
                            }}
                          />
                          {supplier.name}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={supplierPrices[supplier.name] || ""}
                          disabled={!linked}
                          onChange={(event) => setSupplierPrices({ ...supplierPrices, [supplier.name]: event.target.value })}
                          placeholder="Supplier price"
                          className="mt-2 w-full rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
                        />
                      </div>
                    );
                  })}
                  {suppliers.length === 0 && <p className="text-sm text-muted-foreground">No suppliers registered yet.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Merge className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Merge Duplicate Product</h3>
                </div>
                <div className="flex gap-3">
                  <select value={mergeKey} onChange={(event) => setMergeKey(event.target.value)} className="flex-1 rounded-lg border border-input bg-input-background px-3 py-2 text-sm outline-none focus:border-primary">
                    <option value="">Select duplicate to merge into this product</option>
                    {catalog.filter((product) => product.key !== selectedProduct.key).map((product) => (
                      <option key={product.key} value={product.key}>{product.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={mergeDuplicate} disabled={!mergeKey} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    Merge
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={saveProduct} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary/90">
                  <Save className="h-4 w-4" />
                  Save Master Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
