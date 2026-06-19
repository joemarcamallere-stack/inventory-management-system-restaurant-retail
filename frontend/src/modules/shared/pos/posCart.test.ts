import { describe, expect, it } from 'vitest';
import {
  addOrIncrementCartItem,
  calculatePOSCartTotals,
  createPOSOrderPayload,
  createSalePayload,
  updateCartItemDetails,
  updateCartItemQuantity,
  type POSCartState,
} from './posCart';

describe('POS cart logic', () => {
  it('adds and increments inventory items without exceeding stock', () => {
    const first = addOrIncrementCartItem([], {
      inventoryItemId: 'item-1',
      name: 'Denim Jacket',
      category: 'Jackets',
      unitPrice: 250,
      availableStock: 2,
    });

    const second = addOrIncrementCartItem(first, {
      inventoryItemId: 'item-1',
      name: 'Denim Jacket',
      category: 'Jackets',
      unitPrice: 250,
      availableStock: 2,
    });

    const third = addOrIncrementCartItem(second, {
      inventoryItemId: 'item-1',
      name: 'Denim Jacket',
      category: 'Jackets',
      unitPrice: 250,
      availableStock: 2,
    });

    expect(third).toHaveLength(1);
    expect(third[0]).toMatchObject({
      quantity: 2,
      totalPrice: 500,
    });
  });

  it('removes an item when quantity is set to zero', () => {
    const items = addOrIncrementCartItem([], {
      inventoryItemId: 'item-1',
      name: 'Cap',
      unitPrice: 120,
    });

    expect(updateCartItemQuantity(items, 'item-1', 0)).toEqual([]);
  });

  it('updates item-level notes, customizations, and order type', () => {
    const items = addOrIncrementCartItem([], {
      recipeId: 'recipe-1',
      name: 'Burger',
      unitPrice: 220,
      itemType: 'dine-in',
    });

    expect(updateCartItemDetails(items, 'recipe-1', {
      itemType: 'takeout',
      notes: 'No onions',
      customizations: ['Extra sauce'],
    })[0]).toMatchObject({
      itemType: 'takeout',
      notes: 'No onions',
      customizations: ['Extra sauce'],
    });
  });

  it('calculates totals with discount, tax, and service charge', () => {
    const items = [
      {
        id: 'item-1',
        kind: 'inventory' as const,
        inventoryItemId: 'item-1',
        name: 'Polo Shirt',
        quantity: 2,
        unitPrice: 150,
        totalPrice: 300,
      },
    ];

    expect(calculatePOSCartTotals(items, {
      discount: 25,
      tax: 10,
      serviceCharge: 5,
    })).toEqual({
      subtotal: 300,
      discount: 25,
      tax: 10,
      serviceCharge: 5,
      total: 290,
      itemCount: 2,
    });
  });

  it('maps cart state to a POS order payload', () => {
    const state: POSCartState = {
      items: [
        {
          id: 'recipe-1',
          kind: 'recipe',
          recipeId: 'recipe-1',
          name: 'Truffle Pasta',
          category: 'Pasta',
          quantity: 1,
          unitPrice: 380,
          totalPrice: 380,
          itemType: 'dine-in',
          customizations: ['No garlic'],
        },
      ],
      discount: 20,
      discountType: 'Staff Meal',
      tax: 45.6,
      serviceCharge: 38,
      customer: { name: 'Juan Dela Cruz', contactNumber: '09170000000' },
    };

    expect(createPOSOrderPayload(state, {
      locationId: 'location-1',
      orderType: 'DINE_IN',
      tableId: 'table-1',
      tableName: 'Table 1',
      partySize: 2,
    })).toMatchObject({
      locationId: 'location-1',
      orderType: 'DINE_IN',
      tableId: 'table-1',
      tableName: 'Table 1',
      partySize: 2,
      customerName: 'Juan Dela Cruz',
      contactNumber: '09170000000',
      discount: 20,
      discountType: 'Staff Meal',
      tax: 45.6,
      serviceCharge: 38,
      items: [
        {
          recipeId: 'recipe-1',
          name: 'Truffle Pasta',
          quantity: 1,
          unitPrice: 380,
          totalPrice: 380,
          itemType: 'dine-in',
          customizations: ['No garlic'],
        },
      ],
    });
  });

  it('maps retail cart state to the legacy sale payload while screens are migrating', () => {
    const state: POSCartState = {
      items: [
        {
          id: 'item-1',
          kind: 'inventory',
          inventoryItemId: 'item-1',
          name: 'Sneakers',
          quantity: 1,
          unitPrice: 400,
          totalPrice: 400,
        },
      ],
      discount: 0,
      tax: 0,
      serviceCharge: 0,
      customer: { name: 'Anna Lim' },
    };

    expect(createSalePayload(state, {
      locationId: 'location-1',
      paymentMethod: 'Cash',
      amountPaid: 500,
    })).toEqual({
      locationId: 'location-1',
      items: [{ inventoryItemId: 'item-1', quantity: 1, unitPrice: 400 }],
      discount: undefined,
      tax: undefined,
      paymentMethod: 'Cash',
      amountPaid: 500,
      customer: 'Anna Lim',
    });
  });
});
