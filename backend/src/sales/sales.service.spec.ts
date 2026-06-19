import { BusinessModule } from '@prisma/client';
import { SalesService } from './sales.service';

describe('SalesService', () => {
  it('sets refundedAt on full refund without mutating original monetary fields', async () => {
    const sale = {
      id: 'sale-id',
      transactionNumber: 'TXN-1',
      locationId: 'location-id',
      businessId: 'business-id',
      module: BusinessModule.RETAIL,
      status: 'COMPLETED',
      total: 150,
      amountPaid: 200,
      posOrder: null,
      items: [
        {
          inventoryItemId: 'item-id',
          quantity: 2,
        },
      ],
    };
    const inventoryItem = {
      id: 'item-id',
      name: 'Test Item',
      quantity: 3,
      unit: 'pcs',
    };
    const tx = {
      sale: {
        findFirst: jest.fn().mockResolvedValue(sale),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          ...sale,
          status: 'REFUNDED',
          refundReason: 'Customer return',
        }),
      },
      inventoryItem: {
        findUnique: jest.fn().mockResolvedValue(inventoryItem),
        update: jest.fn().mockResolvedValue({}),
      },
      recipe: {
        findMany: jest.fn(),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      },
      pOSOrder: {
        update: jest.fn(),
      },
      payment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new SalesService(prisma as any);

    await service.refund(
      sale.id,
      'Customer return',
      sale.businessId,
      BusinessModule.RETAIL,
      'user-id',
    );

    expect(tx.sale.updateMany).toHaveBeenCalledWith({
      where: {
        id: sale.id,
        businessId: sale.businessId,
        module: BusinessModule.RETAIL,
        status: 'COMPLETED',
      },
      data: expect.objectContaining({
        status: 'REFUNDED',
        refundReason: 'Customer return',
        refundedAt: expect.any(Date),
      }),
    });
    expect(tx.sale.updateMany.mock.calls[0][0].data).not.toHaveProperty('total');
    expect(tx.sale.updateMany.mock.calls[0][0].data).not.toHaveProperty(
      'amountPaid',
    );
  });

  it('reverses recipe ingredient consumption instead of restocking the menu item on restaurant POS refunds', async () => {
    const sale = {
      id: 'sale-id',
      transactionNumber: 'TXN-RECIPE',
      locationId: 'location-id',
      businessId: 'business-id',
      module: BusinessModule.RESTAURANT,
      status: 'COMPLETED',
      total: 320,
      amountPaid: 500,
      posOrder: {
        id: 'pos-order-id',
        items: [
          {
            recipeId: 'recipe-id',
            inventoryItemId: null,
          },
        ],
      },
      items: [
        {
          inventoryItemId: 'menu-item-id',
          quantity: 2,
        },
      ],
    };
    const ingredientItem = {
      id: 'ingredient-id',
      name: 'Ingredient',
      quantity: 5,
      unit: 'kg',
    };
    const tx = {
      sale: {
        findFirst: jest.fn().mockResolvedValue(sale),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          ...sale,
          status: 'REFUNDED',
          refundReason: 'Wrong order',
        }),
      },
      recipe: {
        findMany: jest.fn().mockResolvedValue([{ menuItemId: 'menu-item-id' }]),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([
          {
            itemId: 'ingredient-id',
            quantity: 1.5,
            unit: 'kg',
            locationId: 'location-id',
          },
        ]),
        create: jest.fn().mockResolvedValue({}),
      },
      inventoryItem: {
        findUnique: jest.fn().mockResolvedValue(ingredientItem),
        update: jest.fn().mockResolvedValue({}),
      },
      pOSOrder: {
        update: jest.fn().mockResolvedValue({}),
      },
      payment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new SalesService(prisma as any);

    await service.refund(
      sale.id,
      'Wrong order',
      sale.businessId,
      BusinessModule.RESTAURANT,
      'user-id',
    );

    expect(tx.inventoryItem.findUnique).toHaveBeenCalledWith({ where: { id: 'ingredient-id' } });
    expect(tx.inventoryItem.findUnique).not.toHaveBeenCalledWith({ where: { id: 'menu-item-id' } });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'ingredient-id' },
      data: { quantity: 6.5 },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'VOID_RESTOCK',
        quantity: 1.5,
        referenceType: 'SALE',
        referenceId: sale.id,
      }),
    });
    expect(tx.pOSOrder.update).toHaveBeenCalledWith({
      where: { id: 'pos-order-id' },
      data: { paymentStatus: 'REFUNDED' },
    });
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { saleId: sale.id, businessId: sale.businessId },
      data: { status: 'REFUNDED' },
    });
  });
});
