import { useEffect, useState } from 'react';
import {
  completeKitchenOrder,
  createInventoryItem,
  createRecipe,
  deleteInventoryItem,
  getInventory,
  getLocations,
  getRecipes,
  updateInventoryItem,
  updateRecipe,
  voidKitchenOrder,
} from '../../app/api/client';

export function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
  void syncRestaurantKey(key, value);
}

export function writeLocalStorageOnly<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function useLocalStorageState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readLocalStorage(key, fallback));

  useEffect(() => {
    writeLocalStorage(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

function readRaw<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeRaw<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function syncRestaurantKey<T>(key: string, value: T) {
  if (typeof window === 'undefined' || (window as any).__restaurantSyncPaused) return;

  try {
    if (key === 'inventory.products' && Array.isArray(value)) {
      await syncInventoryProducts(value as any[]);
    }
    if (key === 'recipes.records' && Array.isArray(value)) {
      await syncRecipes(value as any[]);
    }
    if (key === 'pos.orders' && Array.isArray(value)) {
      await syncKitchenOrders(value as any[]);
    }
  } catch (error) {
    console.error('[Restaurant Sync] Failed to sync key:', key, error);
    window.dispatchEvent(
      new CustomEvent('restaurant-sync-error', {
        detail: { key, message: error instanceof Error ? error.message : String(error) },
      }),
    );
  }
}

async function syncInventoryProducts(products: any[]) {
  const [locations, ingredients, menuItems, supplies] = await Promise.all([
    getLocations(),
    getInventory({ itemType: 'INGREDIENT' }),
    getInventory({ itemType: 'MENU_ITEM' }),
    getInventory({ itemType: 'SUPPLY' }),
  ]);
  const existing = [...ingredients, ...menuItems, ...supplies];
  const defaultLocation = locations[0];
  if (!defaultLocation) return;

  const idMap = readRaw<Record<string, string>>('inventory.backendIdByLocalId', {});
  // Snapshot of all previously synced backend IDs before this write
  const allSyncedIds = new Set(Object.values(idMap));

  for (const product of products) {
    if (!product?.name) continue;
    const matchedLocation = locations.find((location: any) => location.name === product.location) ?? defaultLocation;
    const backendId =
      product.backendId ??
      idMap[String(product.id)] ??
      existing.find((item: any) => product.sku && item.sku === product.sku)?.id ??
      existing.find((item: any) => item.name?.toLowerCase() === product.name.toLowerCase())?.id;

    const payload = {
      name: product.name,
      // Preserve the original itemType instead of hard-coding INGREDIENT
      itemType: (product.itemType as string) ?? 'INGREDIENT',
      sku: product.sku || undefined,
      category: product.category || 'Uncategorized > General',
      quantity: Number(product.stock ?? product.quantity ?? 0),
      price: Number(product.price ?? 0),
      unit: product.unit || 'pcs',
      minStock: Number(product.minStock ?? product.reorderPoint ?? 0),
      maxStock: Number(product.maxStock ?? product.stock ?? 0),
      reorderPoint: Number(product.reorderPoint ?? product.minStock ?? 0),
      expiryDate: product.expiry ? new Date(product.expiry).toISOString() : undefined,
      storageTemperature: product.storageTemperature || undefined,
      locationId: matchedLocation.id,
    };

    const saved = backendId
      ? await updateInventoryItem(backendId, payload)
      : await createInventoryItem(payload);

    if (product.id) idMap[String(product.id)] = saved.id;
  }

  // Delete backend items that were previously synced but are no longer in local state
  const currentBackendIds = new Set(
    products
      .map(p => p.backendId ?? idMap[String(p.id)])
      .filter((id): id is string => !!id),
  );
  for (const item of existing) {
    if (allSyncedIds.has(item.id) && !currentBackendIds.has(item.id)) {
      await deleteInventoryItem(item.id);
      // Remove the stale local→backend mapping so a reused local ID creates a
      // fresh backend record instead of trying to update the deleted one.
      const localId = Object.keys(idMap).find(key => idMap[key] === item.id);
      if (localId) delete idMap[localId];
    }
  }

  writeRaw('inventory.backendIdByLocalId', idMap);
}

async function syncRecipes(recipes: any[]) {
  const [backendRecipes, ingredients, menuItems] = await Promise.all([
    getRecipes(),
    getInventory({ itemType: 'INGREDIENT' }),
    getInventory({ itemType: 'MENU_ITEM' }),
  ]);
  const productIdMap = readRaw<Record<string, string>>('inventory.backendIdByLocalId', {});
  const recipeIdMap = readRaw<Record<string, string>>('recipes.backendIdByLocalId', {});

  for (const recipe of recipes) {
    if (!recipe?.name) continue;
    const recipeIngredients = (recipe.ingredients ?? [])
      .map((ingredient: any) => {
        const backendItemId =
          ingredient.backendId ??
          (ingredient.productId ? productIdMap[String(ingredient.productId)] : undefined) ??
          ingredients.find((item: any) => ingredient.productSku && item.sku === ingredient.productSku)?.id ??
          ingredients.find((item: any) => item.name?.toLowerCase() === ingredient.name?.toLowerCase())?.id;

        if (!backendItemId) return null;
        return {
          itemId: backendItemId,
          quantity: Number(ingredient.inventoryQuantity ?? ingredient.quantity ?? 1),
          unit: ingredient.inventoryUnit ?? ingredient.unit ?? 'pcs',
          unitCost: Number(ingredient.unitCost ?? 0),
        };
      })
      .filter(Boolean);

    if (!recipeIngredients.length) continue;

    const existingRecipe =
      backendRecipes.find((item: any) => item.id === recipe.id) ??
      backendRecipes.find((item: any) => item.id === recipeIdMap[String(recipe.id)]) ??
      backendRecipes.find((item: any) => item.name?.toLowerCase() === recipe.name.toLowerCase());
    const linkedMenuItem = menuItems.find((item: any) => item.name?.toLowerCase() === recipe.name.toLowerCase());
    const payload = {
      name: recipe.name,
      category: recipe.category || 'Main Course',
      servings: Number(recipe.servings ?? 1),
      yieldPercentage: Number(recipe.yieldPercentage ?? 100),
      prepTimeMinutes: Number(recipe.prepTime ?? 0),
      instructions: recipe.instructions ?? '',
      targetFoodCost: Number(recipe.targetFoodCost ?? 0),
      sellingPrice: Number(recipe.sellingPrice ?? recipe.suggestedSellingPrice ?? 0),
      isActive: recipe.isActive ?? true,
      menuItemId: linkedMenuItem?.id,
      ingredients: recipeIngredients,
    };

    const saved = existingRecipe
      ? await updateRecipe(existingRecipe.id, payload)
      : await createRecipe(payload);

    if (recipe.id) recipeIdMap[String(recipe.id)] = saved.id;
  }

  writeRaw('recipes.backendIdByLocalId', recipeIdMap);
}

async function syncKitchenOrders(orders: any[]) {
  const recipeIdMap = readRaw<Record<string, string>>('recipes.backendIdByLocalId', {});
  const orderIdMap = readRaw<Record<string, string>>('pos.backendIdByLocalId', {});
  const voidedSynced = readRaw<Record<string, boolean>>('pos.voidedSynced', {});

  for (const order of orders) {
    if (!order?.receiptNo) continue;

    if (order.status === 'completed' && !orderIdMap[String(order.id)]) {
      const recipeId = recipeIdMap[String(order.recipeId)] ?? order.recipeId;
      if (!recipeId) continue;

      const saved = await completeKitchenOrder({
        receiptNo: order.receiptNo,
        recipeId,
        quantity: Number(order.quantity ?? 1),
        notes: order.notes,
      });

      if (order.id) orderIdMap[String(order.id)] = saved.id;
    }

    // Sync void to backend — only once per order
    if (order.status === 'voided' && !voidedSynced[String(order.id)]) {
      const backendId =
        orderIdMap[String(order.id)] ??
        (typeof order.id === 'string' && order.id.includes('-') ? order.id : undefined);
      if (!backendId) continue;

      await voidKitchenOrder(backendId, order.voidReason || 'Voided from restaurant UI');
      voidedSynced[String(order.id)] = true;
    }
  }

  writeRaw('pos.backendIdByLocalId', orderIdMap);
  writeRaw('pos.voidedSynced', voidedSynced);
}
