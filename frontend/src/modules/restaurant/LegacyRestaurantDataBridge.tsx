import { ReactNode, useEffect, useState } from 'react';
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

  useEffect(() => {
    const hydrate = async () => {
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

        writeLocalStorage(
          'inventory.products',
          foodItems.map((item: any, index: number) => ({
            id: index + 1,
            backendId: item.id,
            name: item.name,
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

        writeLocalStorage(
          'inventory.movements',
          movements.map((movement: any) => ({
            id: movement.id,
            type: movement.type,
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
      } catch {
        // The legacy UI can still render with its own empty defaults if hydration fails.
      } finally {
        (window as any).__restaurantSyncPaused = false;
        setReady(true);
      }
    };

    hydrate();
  }, [currentUser?.email, currentUser?.role]);

  if (!ready) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-border bg-card p-6 text-foreground shadow-sm">
          Loading restaurant module...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
