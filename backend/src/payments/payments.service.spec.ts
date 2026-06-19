import { BusinessModule, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  it('lists payments scoped to the current business and module', async () => {
    const prisma = {
      payment: {
        findMany: jest.fn().mockResolvedValue([{ id: 'payment-1' }]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new PaymentsService(prisma as any);

    const result = await service.findAll(
      'business-id',
      BusinessModule.RETAIL,
      {
        method: 'Cash',
        status: PaymentStatus.PAID,
        posOrderId: 'order-1',
        dateFrom: '2026-06-01T00:00:00.000Z',
        dateTo: '2026-06-02T00:00:00.000Z',
      },
      2,
      25,
    );

    const expectedWhere = {
      businessId: 'business-id',
      method: 'Cash',
      status: PaymentStatus.PAID,
      posOrderId: 'order-1',
      paidAt: {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lte: new Date('2026-06-02T00:00:00.000Z'),
      },
      OR: [
        { sale: { module: BusinessModule.RETAIL } },
        { posOrder: { module: BusinessModule.RETAIL } },
      ],
    };

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: { paidAt: 'desc' },
        skip: 25,
        take: 25,
      }),
    );
    expect(prisma.payment.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(result).toMatchObject({ data: [{ id: 'payment-1' }], total: 1, page: 2, limit: 25 });
  });
});
