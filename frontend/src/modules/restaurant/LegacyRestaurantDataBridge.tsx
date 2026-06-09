import { ReactNode, useCallback, useEffect, useState } from 'react';
import { getInventory, getKitchenOrders, getRecipes, getStockMovements } from '../../app/api/client';
import { writeLocalStorage } from '../lib/localStorage';

type Props = {
  currentUser?: { email?: string; role?: string } | null;
  children: ReactNode;
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

export default function LegacyRestaurantDataBridge({ currentUser, children }: Props) {
  const [ready, setReady] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    setHydrationError(null);
    setReady(false);
    try {
      (window as any).__restaurantSyncPaused = true;
      if (currentUser?.role) {
        writeLocalStorage('userRole', currentUser.role.toLowerCase());
      }
      if (currentUser?.email) {
        writeLocalStorage('userEmail', currentUser.email);
      }

      const [ingredients, menuItems, supplies, recipes, orders, movements] = await Promise.all([
        getInventory({ itemType: 'INGREDIENT' }),
        getInventory({ itemType: 'MENU_ITEM' }),
        getInventory({ itemType: 'SUPPLY' }),
        getRecipes(),
        getKitchenOrders(),
        getStockMovements(),
      ]);

      const foodItems = [...ingredients, ...menuItems, ...supplies];
      const idByBackendId = new Map(foodItems.map((item: any, index: number) => [item.id, index + 1]));

      // Initialize the backend ID map so deletion sync works immediately after login
      const backendIdMap: Record<string, string> = {};
      foodItems.forEach((item: any, index: number) => {
        backendIdMap[String(index + 1)] = item.id;
      });
      window.localStorage.setItem('inventory.backendIdByLocalId', JSON.stringify(backendIdMap));

      writeLocalStorage(
        'inventory.products',
        foodItems.map((item: any, index: number) => ({
          id: index + 1,
          backendId: item.id,
          name: item.name,
          // Preserve itemType so sync can send the correct type back
          itemType: item.itemType ?? 'INGREDIENT',
          sku: item.sku ?? `REST-${index + 1}`,
          category: item.category?.includes(' > ') ? item.category : `${item.category || 'Uncategorized'} > General`,
          stock: item.quantity ?? 0,
          maxStock: item.maxStock ?? Math.max(item.quantity ?? 0, item.reorderPoint ?? 0, 1),
          minStock: item.minStock ?? item.reorderPoint ?? 0,
          reorderPoint: item.reorderPoint ?? item.minStock ?? 0,
          price: item.price ?? 0,
          expiry: toDateInput(item.expiryDate),
          location: item.location?.name ?? 'Unassigned',
          unit: item.unit ?? 'pcs',
          storageTemperature: item.storageTemperature ?? 'Dry Storage',
        })),
      );

      writeLocalStorage(
        'recipes.records',
        recipes.map((recipe: any) => {
          const legacyIngredients = (recipe.ingredients ?? []).map((ingredient: any) => ({
            id: ingredient.id,
            productId: idByBackendId.get(ingredient.itemId),
            productSku: ingredient.item?.sku,
            name: ingredient.item?.name ?? 'Ingredient',
            quantity: ingredient.quantity,
            unit: ingredient.unit ?? ingredient.item?.unit ?? 'pcs',
            inventoryQuantity: ingredient.quantity,
            inventoryUnit: ingredient.item?.unit ?? ingredient.unit ?? 'pcs',
            unitCost: ingredient.unitCost ?? ingredient.item?.price ?? 0,
            totalCost: ingredient.totalCost ?? (ingredient.unitCost ?? ingredient.item?.price ?? 0) * ingredient.quantity,
          }));
          const totalCost = legacyIngredients.reduce((sum: number, ingredient: any) => sum + ingredient.totalCost, 0);
          const costPerServing = totalCost / Math.max(recipe.servings ?? 1, 1);

          return {
            id: recipe.id,
            name: recipe.name,
            category: recipe.category,
            servings: recipe.servings,
            yieldPercentage: recipe.yieldPercentage ?? 100,
            prepTime: recipe.prepTimeMinutes ?? 0,
            ingredients: legacyIngredients,
            totalCost,
            yieldAdjustedCost: totalCost,
            costPerServing,
            targetFoodCost: recipe.targetFoodCost ?? 35,
            suggestedSellingPrice: recipe.sellingPrice ?? 0,
            sellingPrice: recipe.sellingPrice ?? 0,
            grossMargin: 0,
            isActive: recipe.isActive,
            instructions: recipe.instructions ?? '',
          };
        }),
      );

      writeLocalStorage(
        'pos.orders',
        orders.map((order: any) => ({
          id: order.id,
          receiptNo: order.receiptNo,
          recipeId: order.recipeId,
          recipeName: order.recipe?.name ?? 'Recipe',
          quantity: order.quantity,
          status: order.status === 'VOIDED' ? 'voided' : 'completed',
          orderedAt: order.createdAt,
          completedBy: order.completedBy?.email ?? currentUser?.email ?? 'shared-backend',
          notes: order.notes ?? '',
          voidReason: order.voidReason,
          voidedAt: order.voidedAt,
        })),
      );

      // Hydrated orders already exist in the backend. Register their IDs so
      // mounting the POS view never attempts to submit them again.
      const orderBackendIdMap: Record<string, string> = {};
      orders.forEach((order: any) => {
        orderBackendIdMap[String(order.id)] = order.id;
      });
      window.localStorage.setItem('pos.backendIdByLocalId', JSON.stringify(orderBackendIdMap));

      // Mark all already-voided orders so syncKitchenOrders never re-sends the
      // void endpoint for orders that were voided in a previous session.
      const voidedSynced: Record<string, boolean> = {};
      orders.forEach((order: any) => {
        if (order.status === 'VOIDED') voidedSynced[String(order.id)] = true;
      });
      window.localStorage.setItem('pos.voidedSynced', JSON.stringify(voidedSynced));

      writeLocalStorage(
        'inventory.movements',
        movements.map((movement: any) => ({
          id: movement.id,
          type:
            movement.type === 'RECIPE_CONSUMPTION'
              ? 'pos-consumption'
              : movement.type === 'VOID_RESTOCK'
                ? 'pos-void'
                : movement.type,
          source: movement.referenceType ?? 'shared-backend',
          sourceId: movement.referenceId ?? movement.id,
          productId: idByBackendId.get(movement.itemId),
          item: movement.item?.name ?? 'Item',
          quantity: movement.quantity,
          unit: movement.unit ?? movement.item?.unit ?? '',
          date: movement.createdAt,
          notes: movement.notes ?? movement.reason ?? '',
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load restaurant data';
      console.error('[LegacyRestaurantDataBridge] Hydration failed:', error);
      setHydrationError(message);
    } finally {
      (window as any).__restaurantSyncPaused = false;
      setReady(true);
    }
  }, [currentUser?.email, currentUser?.role]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSyncError(detail?.message ?? 'Sync failed — changes may not have saved.');
    };
    window.addEventListener('restaurant-sync-error', handler);
    return () => window.removeEventListener('restaurant-sync-error', handler);
  }, []);

  if (!ready) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-border bg-card p-6 text-foreground shadow-sm">
          Loading restaurant module...
        </div>
      </div>
    );
  }

  if (hydrationError) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-destructive bg-card p-6 text-foreground shadow-sm">
          <p className="font-semibold text-destructive mb-2">Failed to load restaurant data</p>
          <p className="text-sm text-muted-foreground mb-4">{hydrationError}</p>
          <button
            onClick={hydrate}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {syncError && (
        <div className="flex items-center justify-between gap-4 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-2 text-sm">
          <span>Sync error: {syncError}</span>
          <button
            onClick={() => setSyncError(null)}
            className="shrink-0 font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {children}
    </>
  );
}
