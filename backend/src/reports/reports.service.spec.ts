import { BusinessModule, SaleStatus } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('attributes gross sales by createdAt and refunds by refundedAt', async () => {
    const prisma = {
      sale: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({
            _sum: { total: 500, discount: 25, tax: 50 },
          })
          .mockResolvedValueOnce({
            _sum: { total: 150 },
          }),
        count: jest.fn().mockResolvedValue(4),
      },
      kitchenOrder: {
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new ReportsService(prisma as any);

    const result = await service.salesSummary('business-id', {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-07-01T00:00:00.000Z',
      module: BusinessModule.RETAIL,
    });

    expect(prisma.sale.aggregate).toHaveBeenNthCalledWith(1, {
      where: {
        businessId: 'business-id',
        createdAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lt: new Date('2026-07-01T00:00:00.000Z'),
        },
        module: BusinessModule.RETAIL,
      },
      _sum: { total: true, discount: true, tax: true },
    });
    expect(prisma.sale.aggregate).toHaveBeenNthCalledWith(2, {
      where: {
        businessId: 'business-id',
        refundedAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lt: new Date('2026-07-01T00:00:00.000Z'),
        },
        module: BusinessModule.RETAIL,
        status: { in: [SaleStatus.REFUNDED, SaleStatus.PARTIAL_REFUND] },
      },
      _sum: { total: true },
    });
    expect(result).toEqual({
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-07-01T00:00:00.000Z',
      grossSales: 500,
      discounts: 25,
      tax: 50,
      netSales: 350,
      transactionCount: 4,
      averageTicket: 125,
      totalRefunds: 150,
      totalVoids: 0,
    });
    expect(prisma.kitchenOrder.count).not.toHaveBeenCalled();
  });

  it('counts restaurant voids separately from sale revenue', async () => {
    const prisma = {
      sale: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({
            _sum: { total: 300, discount: 0, tax: 0 },
          })
          .mockResolvedValueOnce({
            _sum: { total: null },
          }),
        count: jest.fn().mockResolvedValue(2),
      },
      kitchenOrder: {
        count: jest.fn().mockResolvedValue(3),
      },
    };
    const service = new ReportsService(prisma as any);

    const result = await service.salesSummary('business-id', {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-02T00:00:00.000Z',
      module: BusinessModule.RESTAURANT,
      locationId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result.totalVoids).toBe(3);
    expect(result.netSales).toBe(300);
    expect(prisma.kitchenOrder.count).toHaveBeenCalledWith({
      where: {
        businessId: 'business-id',
        status: 'VOIDED',
        voidedAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lt: new Date('2026-06-02T00:00:00.000Z'),
        },
        locationId: '11111111-1111-1111-1111-111111111111',
      },
    });
  });

  it('resolves sales by location with business-scoped location names', async () => {
    const prisma = {
      sale: {
        groupBy: jest.fn().mockResolvedValue([
          {
            locationId: 'location-1',
            _count: { _all: 3 },
            _sum: { total: 450 },
          },
        ]),
      },
      location: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'location-1', name: 'Main Branch' },
        ]),
      },
    };
    const service = new ReportsService(prisma as any);

    const result = await service.salesByLocation('business-id', {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-07-01T00:00:00.000Z',
      module: BusinessModule.RETAIL,
    });

    expect(prisma.sale.groupBy).toHaveBeenCalledWith({
      by: ['locationId'],
      where: {
        businessId: 'business-id',
        createdAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lt: new Date('2026-07-01T00:00:00.000Z'),
        },
        module: BusinessModule.RETAIL,
      },
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    });
    expect(prisma.location.findMany).toHaveBeenCalledWith({
      where: { businessId: 'business-id', id: { in: ['location-1'] } },
      select: { id: true, name: true },
    });
    expect(result).toEqual([
      {
        locationId: 'location-1',
        locationName: 'Main Branch',
        transactionCount: 3,
        grossSales: 450,
      },
    ]);
  });

  it('reports paid POS order totals by order type', async () => {
    const prisma = {
      pOSOrder: {
        groupBy: jest.fn().mockResolvedValue([
          {
            orderType: 'DINE_IN',
            _count: { _all: 2 },
            _sum: { total: 300 },
          },
        ]),
      },
    };
    const service = new ReportsService(prisma as any);

    const result = await service.salesByOrderType('business-id', {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-07-01T00:00:00.000Z',
      module: BusinessModule.RESTAURANT,
      cashierId: 'cashier-1',
    });

    expect(prisma.pOSOrder.groupBy).toHaveBeenCalledWith({
      by: ['orderType'],
      where: {
        businessId: 'business-id',
        createdAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lt: new Date('2026-07-01T00:00:00.000Z'),
        },
        paymentStatus: {
          in: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'],
        },
        module: BusinessModule.RESTAURANT,
        createdById: 'cashier-1',
      },
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    });
    expect(result).toEqual([
      {
        orderType: 'DINE_IN',
        orderCount: 2,
        grossSales: 300,
      },
    ]);
  });
});
