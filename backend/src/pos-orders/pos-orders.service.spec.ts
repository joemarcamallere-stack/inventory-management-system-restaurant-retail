import { BusinessModule, DiningTableStatus, POSOrderType } from '@prisma/client';
import { POSOrdersService } from './pos-orders.service';

describe('POSOrdersService', () => {
  it('creates an open unpaid order without deducting stock', async () => {
    const tx = {
      location: {
        findFirst: jest.fn().mockResolvedValue({ id: 'location-id' }),
      },
      diningTable: {
        findFirst: jest.fn(),
      },
      pOSOrder: {
        create: jest.fn().mockResolvedValue({ id: 'pos-order-id' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'pos-order-id' }),
      },
      inventoryItem: {
        update: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new POSOrdersService(prisma as any);

    await service.create(
      {
        orderType: POSOrderType.RETAIL,
        locationId: 'location-id',
        discount: 10,
        tax: 5,
        serviceCharge: 0,
        items: [
          {
            inventoryItemId: 'item-id',
            name: 'Test Item',
            quantity: 2,
            unitPrice: 50,
          },
        ],
      },
      'business-id',
      BusinessModule.RETAIL,
      'user-id',
    );

    expect(tx.pOSOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 100,
          discount: 10,
          tax: 5,
          total: 95,
          businessId: 'business-id',
          module: BusinessModule.RETAIL,
          createdById: 'user-id',
          items: {
            create: [
              expect.objectContaining({
                inventoryItemId: 'item-id',
                quantity: 2,
                unitPrice: 50,
                totalPrice: 100,
              }),
            ],
          },
        }),
      }),
    );
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('marks a selected dining table occupied when creating a dine-in order', async () => {
    const tx = {
      location: {
        findFirst: jest.fn().mockResolvedValue({ id: 'location-id' }),
      },
      diningTable: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'table-id',
          locationId: 'location-id',
          status: DiningTableStatus.AVAILABLE,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      pOSOrder: {
        create: jest.fn().mockResolvedValue({
          id: 'pos-order-id',
          orderNumber: 'ORD-1',
          locationId: 'location-id',
          tableId: 'table-id',
          tableName: 'Table 1',
        }),
        findUnique: jest.fn().mockResolvedValue({ id: 'pos-order-id' }),
      },
      kitchenOrder: {
        create: jest.fn().mockResolvedValue({ id: 'kitchen-order-id' }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new POSOrdersService(prisma as any);

    await service.create(
      {
        orderType: POSOrderType.DINE_IN,
        locationId: 'location-id',
        tableId: 'table-id',
        tableName: 'Table 1',
        items: [
          {
            recipeId: 'recipe-id',
            name: 'Pasta',
            quantity: 1,
            unitPrice: 150,
          },
        ],
      },
      'business-id',
      BusinessModule.RESTAURANT,
      'user-id',
    );

    expect(tx.diningTable.updateMany).toHaveBeenCalledWith({
      where: { id: 'table-id', businessId: 'business-id' },
      data: { status: DiningTableStatus.OCCUPIED },
    });
    expect(tx.kitchenOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        receiptNo: 'ORD-1-K1',
        recipeId: 'recipe-id',
        quantity: 1,
        status: 'PENDING',
        locationId: 'location-id',
        tableId: 'table-id',
        posOrderId: 'pos-order-id',
        businessId: 'business-id',
      }),
    });
  });

  it('voids active POS-linked kitchen tickets when voiding an unpaid dine-in order', async () => {
    const order = { id: 'pos-order-id', tableId: 'table-id' };
    const tx = {
      pOSOrder: {
        findFirst: jest.fn().mockResolvedValue(order),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ id: order.id }),
      },
      diningTable: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      kitchenOrder: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new POSOrdersService(prisma as any);

    await service.void(order.id, 'Customer cancelled', 'business-id', BusinessModule.RESTAURANT);

    expect(tx.kitchenOrder.updateMany).toHaveBeenCalledWith({
      where: {
        posOrderId: order.id,
        businessId: 'business-id',
        status: { in: ['PENDING', 'PREPARING', 'READY'] },
      },
      data: {
        status: 'VOIDED',
        voidReason: 'Customer cancelled',
        voidedAt: expect.any(Date),
      },
    });
    expect(tx.diningTable.updateMany).toHaveBeenCalledWith({
      where: { id: 'table-id', businessId: 'business-id' },
      data: { status: DiningTableStatus.AVAILABLE },
    });
  });

  it('completes payment by creating sale, payment, receipt, and stock movement atomically', async () => {
    const order = {
      id: 'pos-order-id',
      orderNumber: 'ORD-1',
      locationId: 'location-id',
      businessId: 'business-id',
      module: BusinessModule.RETAIL,
      saleId: null,
      sale: null,
      paymentStatus: 'NOT_PAID',
      status: 'PENDING',
      customerName: 'Walk-in',
      subtotal: 100,
      discount: 5,
      tax: 0,
      serviceCharge: 0,
      total: 95,
      items: [
        {
          id: 'order-item-id',
          inventoryItemId: 'item-id',
          name: 'Test Item',
          quantity: 2,
          unitPrice: 50,
          totalPrice: 100,
        },
      ],
    };
    const inventoryItem = {
      id: 'item-id',
      name: 'Test Item',
      quantity: 5,
      unit: 'pcs',
    };
    const sale = { id: 'sale-id', transactionNumber: 'TXN-1' };
    const payment = { id: 'payment-id', paymentNumber: 'PAY-1' };
    const tx = {
      pOSOrder: {
        findFirst: jest.fn().mockResolvedValue(order),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ id: order.id, saleId: sale.id }),
      },
      inventoryItem: {
        findMany: jest.fn().mockResolvedValue([inventoryItem]),
        update: jest.fn().mockResolvedValue({}),
      },
      sale: {
        create: jest.fn().mockResolvedValue(sale),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({}),
      },
      payment: {
        create: jest.fn().mockResolvedValue(payment),
      },
      receipt: {
        create: jest.fn().mockResolvedValue({}),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new POSOrdersService(prisma as any);

    await service.completePayment(
      order.id,
      {
        paymentMethod: 'Cash' as any,
        amountPaid: 100,
      },
      order.businessId,
      BusinessModule.RETAIL,
      'user-id',
    );

    expect(tx.sale.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locationId: order.locationId,
        cashierId: 'user-id',
        subtotal: 100,
        discount: 5,
        tax: 0,
        total: 95,
        paymentMethod: 'Cash',
        amountPaid: 100,
        change: 5,
        customer: 'Walk-in',
        businessId: order.businessId,
        module: BusinessModule.RETAIL,
        items: {
          create: [
            {
              inventoryItemId: 'item-id',
              name: 'Test Item',
              quantity: 2,
              unitPrice: 50,
              totalPrice: 100,
            },
          ],
        },
      }),
    });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: inventoryItem.id },
      data: { quantity: 3 },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'SALE',
        quantity: 2,
        previousQuantity: 5,
        newQuantity: 3,
        referenceType: 'SALE',
        referenceId: sale.id,
        itemId: inventoryItem.id,
        locationId: order.locationId,
        businessId: order.businessId,
        module: BusinessModule.RETAIL,
        createdById: 'user-id',
      }),
    });
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        method: 'Cash',
        amountDue: 95,
        amountPaid: 100,
        change: 5,
        saleId: sale.id,
        posOrderId: order.id,
        businessId: order.businessId,
        processedById: 'user-id',
      }),
    });
    expect(tx.receipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        saleId: sale.id,
        posOrderId: order.id,
        paymentId: payment.id,
        businessId: order.businessId,
      }),
    });
    expect(tx.pOSOrder.update).toHaveBeenCalledWith({
      where: { id: order.id },
      data: expect.objectContaining({
        saleId: sale.id,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        completedAt: expect.any(Date),
      }),
    });
  });

  it('completes restaurant recipe payment by selling the menu item and deducting ingredients', async () => {
    const order = {
      id: 'restaurant-order-id',
      orderNumber: 'ORD-R1',
      locationId: 'location-id',
      businessId: 'business-id',
      module: BusinessModule.RESTAURANT,
      saleId: null,
      sale: null,
      paymentStatus: 'NOT_PAID',
      status: 'PENDING',
      customerName: 'Dine-in',
      subtotal: 250,
      discount: 0,
      tax: 0,
      serviceCharge: 0,
      total: 250,
      items: [
        {
          id: 'recipe-order-item-id',
          inventoryItemId: null,
          recipeId: 'recipe-id',
          name: 'Pasta',
          quantity: 2,
          unitPrice: 125,
          totalPrice: 250,
        },
      ],
    };
    const recipe = {
      id: 'recipe-id',
      name: 'Pasta',
      servings: 1,
      menuItemId: 'menu-item-id',
      ingredients: [
        {
          itemId: 'ingredient-id',
          quantity: 0.5,
          unit: 'kg',
        },
      ],
    };
    const ingredientItem = {
      id: 'ingredient-id',
      name: 'Noodles',
      quantity: 3,
      unit: 'kg',
      locationId: 'location-id',
    };
    const sale = { id: 'sale-id', transactionNumber: 'TXN-R1' };
    const payment = { id: 'payment-id', paymentNumber: 'PAY-R1' };
    const tx = {
      pOSOrder: {
        findFirst: jest.fn().mockResolvedValue(order),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ id: order.id, saleId: sale.id }),
      },
      recipe: {
        findMany: jest.fn().mockResolvedValue([recipe]),
      },
      inventoryItem: {
        findMany: jest.fn().mockResolvedValue([ingredientItem]),
        update: jest.fn().mockResolvedValue({}),
      },
      sale: {
        create: jest.fn().mockResolvedValue(sale),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({}),
      },
      payment: {
        create: jest.fn().mockResolvedValue(payment),
      },
      receipt: {
        create: jest.fn().mockResolvedValue({}),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new POSOrdersService(prisma as any);

    await service.completePayment(
      order.id,
      {
        paymentMethod: 'Cash' as any,
        amountPaid: 300,
      },
      order.businessId,
      BusinessModule.RESTAURANT,
      'user-id',
    );

    expect(tx.sale.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        module: BusinessModule.RESTAURANT,
        items: {
          create: [
            {
              inventoryItemId: 'menu-item-id',
              name: 'Pasta',
              quantity: 2,
              unitPrice: 125,
              totalPrice: 250,
            },
          ],
        },
      }),
    });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'ingredient-id' },
      data: { quantity: 2 },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'RECIPE_CONSUMPTION',
        quantity: 1,
        previousQuantity: 3,
        newQuantity: 2,
        reason: 'POS order recipe consumption',
        referenceType: 'POS_ORDER',
        referenceId: order.id,
        itemId: 'ingredient-id',
        locationId: 'location-id',
        businessId: order.businessId,
        module: BusinessModule.RESTAURANT,
      }),
    });
  });

  it('releases a dining table when a dine-in order is paid', async () => {
    const order = {
      id: 'restaurant-order-id',
      orderNumber: 'ORD-T1',
      locationId: 'location-id',
      tableId: 'table-id',
      businessId: 'business-id',
      module: BusinessModule.RESTAURANT,
      saleId: null,
      sale: null,
      paymentStatus: 'NOT_PAID',
      status: 'PENDING',
      customerName: 'Dine-in',
      subtotal: 100,
      discount: 0,
      tax: 0,
      serviceCharge: 0,
      total: 100,
      items: [
        {
          id: 'order-item-id',
          inventoryItemId: 'item-id',
          recipeId: null,
          name: 'Bottled Water',
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
        },
      ],
    };
    const tx = {
      pOSOrder: {
        findFirst: jest.fn().mockResolvedValue(order),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ id: order.id, tableId: order.tableId }),
      },
      diningTable: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventoryItem: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'item-id', name: 'Bottled Water', quantity: 5, unit: 'pc' },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      sale: {
        create: jest.fn().mockResolvedValue({ id: 'sale-id' }),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({}),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'payment-id' }),
      },
      receipt: {
        create: jest.fn().mockResolvedValue({}),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new POSOrdersService(prisma as any);

    await service.completePayment(
      order.id,
      { paymentMethod: 'Cash' as any, amountPaid: 100 },
      order.businessId,
      BusinessModule.RESTAURANT,
      'user-id',
    );

    expect(tx.diningTable.updateMany).toHaveBeenCalledWith({
      where: { id: 'table-id', businessId: order.businessId },
      data: { status: DiningTableStatus.AVAILABLE },
    });
  });
});
