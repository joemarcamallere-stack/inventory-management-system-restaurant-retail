import { BusinessModule } from '@prisma/client';
import { ReceiptsService } from './receipts.service';

describe('ReceiptsService', () => {
  it('lists receipts scoped to the current business and module', async () => {
    const prisma = {
      receipt: {
        findMany: jest.fn().mockResolvedValue([{ id: 'receipt-1' }]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new ReceiptsService(prisma as any);

    const result = await service.findAll(
      'business-id',
      BusinessModule.RESTAURANT,
      {
        paymentId: 'payment-1',
        dateFrom: '2026-06-01T00:00:00.000Z',
        dateTo: '2026-06-02T00:00:00.000Z',
      },
      1,
      10,
    );

    const expectedWhere = {
      businessId: 'business-id',
      paymentId: 'payment-1',
      createdAt: {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lte: new Date('2026-06-02T00:00:00.000Z'),
      },
      OR: [
        { sale: { module: BusinessModule.RESTAURANT } },
        { posOrder: { module: BusinessModule.RESTAURANT } },
      ],
    };

    expect(prisma.receipt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      }),
    );
    expect(prisma.receipt.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(result).toMatchObject({ data: [{ id: 'receipt-1' }], total: 1, page: 1, limit: 10 });
  });

  it('marks a receipt printed after checking module ownership', async () => {
    const foundReceipt = { id: 'receipt-1', receiptNumber: 'REC-1' };
    const prisma = {
      receipt: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(foundReceipt)
          .mockResolvedValueOnce({ ...foundReceipt, printedAt: new Date('2026-06-01T00:00:00.000Z') }),
        update: jest.fn().mockResolvedValue(foundReceipt),
      },
    };
    const service = new ReceiptsService(prisma as any);

    await service.markPrinted('receipt-1', 'business-id', BusinessModule.RETAIL);

    expect(prisma.receipt.update).toHaveBeenCalledWith({
      where: { id: 'receipt-1' },
      data: { printedAt: expect.any(Date) },
    });
    expect(prisma.receipt.findFirst).toHaveBeenCalledTimes(2);
  });
});
