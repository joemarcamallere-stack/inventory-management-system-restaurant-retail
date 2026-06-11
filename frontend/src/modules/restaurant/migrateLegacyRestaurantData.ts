import {
  approvePurchaseOrder,
  completeKitchenOrder,
  completeTransfer,
  createInventoryItem,
  createPurchaseOrder,
  createRecipe,
  createStockMovement,
  createSupplier,
  createTransfer,
  dispatchTransfer,
  getInventory,
  getKitchenOrders,
  getLocations,
  getPurchaseOrders,
  getRecipes,
  getStockMovements,
  getSuppliers,
  getTransfers,
  submitPurchaseOrder,
  voidKitchenOrder,
} from "../../app/api/client";

const LEGACY_KEYS = [
  "inventory.products",
  "recipes.records",
  "pos.orders",
  "purchaseOrders.orders",
  "purchaseOrders.suppliers",
  "goodsReceived.records",
  "transfers.records",
  "transfers.adjustments",
  "transfers.wasteLogs",
  "users.records",
  "dashboard.pendingOrders",
  "inventory.movements",
  "inventory.backendIdByLocalId",
  "recipes.backendIdByLocalId",
  "pos.backendIdByLocalId",
  "pos.voidedSynced",
] as const;

const read = <T>(key: string, fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalize = (value?: string) => (value || "").trim().toLowerCase();

export async function migrateLegacyRestaurantData(
  businessId: string,
  role: string,
) {
  const marker = `restaurant.backendMigration.v1.${businessId}`;
  if (window.localStorage.getItem(marker)) return;

  const backup = Object.fromEntries(
    LEGACY_KEYS.flatMap((key) => {
      const value = window.localStorage.getItem(key);
      return value === null ? [] : [[key, value]];
    }),
  );
  if (Object.keys(backup).length === 0) {
    window.localStorage.setItem(marker, new Date().toISOString());
    return;
  }
  window.localStorage.setItem(
    `restaurant.legacyBackup.${businessId}.${Date.now()}`,
    JSON.stringify(backup),
  );

  const locations = await getLocations();
  const defaultLocation = locations[0];
  if (!defaultLocation) throw new Error("A location is required before legacy restaurant data can be migrated.");

  const backendItems = (
    await Promise.all([
      getInventory({ itemType: "INGREDIENT" }),
      getInventory({ itemType: "MENU_ITEM" }),
      getInventory({ itemType: "SUPPLY" }),
    ])
  ).flat();
  const localItems = read<any[]>("inventory.products", []);
  const itemByLocalId = new Map<string, any>();

  for (const local of localItems) {
    let item =
      backendItems.find((candidate) => local.backendId === candidate.id) ??
      backendItems.find((candidate) => local.sku && normalize(candidate.sku) === normalize(local.sku)) ??
      backendItems.find((candidate) => normalize(candidate.name) === normalize(local.name));
    if (!item && local.name) {
      const location =
        locations.find((candidate: any) => normalize(candidate.name) === normalize(local.location)) ??
        defaultLocation;
      const expiryDate =
        local.expiry && new Date(local.expiry) > new Date()
          ? new Date(`${local.expiry}T00:00:00`).toISOString()
          : undefined;
      item = await createInventoryItem({
        name: local.name,
        itemType: local.itemType || "INGREDIENT",
        sku: local.sku || undefined,
        category: local.category || "Uncategorized",
        quantity: Number(local.stock ?? local.quantity ?? 0),
        price: Number(local.price ?? 0),
        unit: local.unit || "pcs",
        minStock: Number(local.minStock ?? 0),
        maxStock: Number(local.maxStock ?? local.stock ?? 1),
        reorderPoint: Number(local.reorderPoint ?? local.minStock ?? 0),
        expiryDate,
        storageTemperature: local.storageTemperature || undefined,
        locationId: location.id,
      });
      backendItems.push(item);
    }
    if (item && local.id !== undefined) itemByLocalId.set(String(local.id), item);
  }

  const backendRecipes = await getRecipes();
  const recipeByLocalId = new Map<string, any>();
  for (const local of read<any[]>("recipes.records", [])) {
    let recipe = backendRecipes.find((candidate) => normalize(candidate.name) === normalize(local.name));
    const ingredients = (local.ingredients || []).flatMap((ingredient: any) => {
      const item =
        itemByLocalId.get(String(ingredient.productId)) ??
        backendItems.find((candidate) => normalize(candidate.sku) === normalize(ingredient.productSku)) ??
        backendItems.find((candidate) => normalize(candidate.name) === normalize(ingredient.name));
      return item
        ? [{
            itemId: item.id,
            quantity: Number(ingredient.inventoryQuantity ?? ingredient.quantity ?? 0),
            unit: ingredient.inventoryUnit ?? ingredient.unit ?? item.unit,
            unitCost: Number(ingredient.unitCost ?? item.costPrice ?? item.price ?? 0),
          }]
        : [];
    });
    if (!recipe && local.name && ingredients.length > 0) {
      recipe = await createRecipe({
        name: local.name,
        category: local.category || "Main Course",
        servings: Number(local.servings ?? 1),
        yieldPercentage: Number(local.yieldPercentage ?? 100),
        prepTimeMinutes: Number(local.prepTime ?? 0),
        sellingPrice: Number(local.sellingPrice ?? local.suggestedSellingPrice ?? 0),
        targetFoodCost: Number(local.targetFoodCost ?? 0),
        instructions: local.instructions || "",
        isActive: local.isActive ?? true,
        ingredients,
      });
      backendRecipes.push(recipe);
    }
    if (recipe && local.id !== undefined) recipeByLocalId.set(String(local.id), recipe);
  }

  const backendOrders = await getKitchenOrders();
  for (const local of read<any[]>("pos.orders", [])) {
    if (!local.receiptNo || backendOrders.some((order) => order.receiptNo === local.receiptNo)) continue;
    const recipe =
      recipeByLocalId.get(String(local.recipeId)) ??
      backendRecipes.find((candidate) => normalize(candidate.name) === normalize(local.recipeName));
    if (!recipe) continue;
    const order = await completeKitchenOrder({
      receiptNo: local.receiptNo,
      recipeId: recipe.id,
      quantity: Number(local.quantity ?? 1),
      notes: local.notes || undefined,
    });
    if (local.status === "voided") {
      await voidKitchenOrder(order.id, local.voidReason || "Migrated legacy void");
    }
  }

  const suppliers = await getSuppliers();
  const supplierByName = new Map(suppliers.map((supplier: any) => [normalize(supplier.name), supplier]));
  for (const local of read<any[]>("purchaseOrders.suppliers", [])) {
    if (!local.name || supplierByName.has(normalize(local.name))) continue;
    const supplier = await createSupplier({
      name: local.name,
      contactPerson: local.contact || undefined,
      email: local.email || undefined,
      phone: local.phone || undefined,
      address: local.address || undefined,
    });
    supplierByName.set(normalize(supplier.name), supplier);
  }

  const backendPurchaseOrders = await getPurchaseOrders();
  for (const local of read<any[]>("purchaseOrders.orders", [])) {
    if (backendPurchaseOrders.some((order: any) => order.notes === `Migrated from legacy order ${local.id}`)) continue;
    const lines = (local.orderItems || []).flatMap((line: any) => {
      const item =
        itemByLocalId.get(String(line.inventoryId)) ??
        backendItems.find((candidate) => normalize(candidate.sku) === normalize(line.sku)) ??
        backendItems.find((candidate) => normalize(candidate.name) === normalize(line.productName));
      return item
        ? [{ inventoryItemId: item.id, name: item.name, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) }]
        : [];
    });
    if (lines.length === 0) continue;
    const created = await createPurchaseOrder({
      supplierId: supplierByName.get(normalize(local.supplier))?.id,
      expectedDelivery: local.expectedDelivery
        ? new Date(`${local.expectedDelivery}T00:00:00`).toISOString()
        : undefined,
      notes: `Migrated from legacy order ${local.id}`,
      items: lines,
    });
    backendPurchaseOrders.push(created);
    await submitPurchaseOrder(created.id);
    if (["admin", "manager"].includes(role.toLowerCase()) && ["approved", "received", "partial"].includes(local.status)) {
      await approvePurchaseOrder(created.id);
    }
  }

  const backendTransfers = await getTransfers();
  for (const local of read<any[]>("transfers.records", [])) {
    const migrationNote = local.notes || `Migrated from ${local.id}`;
    if (backendTransfers.some((transfer: any) => transfer.notes === migrationNote)) continue;
    const item = backendItems.find((candidate) => normalize(candidate.name) === normalize(local.item));
    const from = locations.find((candidate: any) => normalize(candidate.name) === normalize(local.from));
    const to = locations.find((candidate: any) => normalize(candidate.name) === normalize(local.to));
    if (!item || !from || !to || item.locationId !== from.id || Number(local.quantity) <= 0) continue;
    const transfer = await createTransfer({
      fromLocationId: from.id,
      toLocationId: to.id,
      notes: migrationNote,
      items: [{ inventoryItemId: item.id, quantity: Number(local.quantity) }],
    });
    backendTransfers.push(transfer);
    if (["in-transit", "completed"].includes(local.status)) await dispatchTransfer(transfer.id);
    if (local.status === "completed") await completeTransfer(transfer.id);
  }

  const migratedMovements = await getStockMovements({ referenceType: "LEGACY_MIGRATION" });
  for (const local of read<any[]>("transfers.wasteLogs", [])) {
    if (migratedMovements.some((movement: any) => movement.referenceId === local.id)) continue;
    const item = backendItems.find((candidate) => normalize(candidate.name) === normalize(local.item));
    if (!item || Number(local.quantity) <= 0) continue;
    await createStockMovement({
      itemId: item.id,
      locationId: item.locationId,
      type: local.wasteType === "expiry" ? "EXPIRY" : "SPOILAGE",
      quantity: Number(local.quantity),
      reason: local.wasteType || "Migrated legacy waste",
      referenceType: "LEGACY_MIGRATION",
      referenceId: local.id,
      notes: local.notes || undefined,
    });
  }

  LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.setItem(marker, new Date().toISOString());
}
