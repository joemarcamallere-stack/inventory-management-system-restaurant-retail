import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessModule, Prisma } from '@prisma/client';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

type ReceiptFilters = {
  saleId?: string;
  posOrderId?: string;
  paymentId?: string;
  dateFrom?: string;
  dateTo?: string;
};

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    businessId: string,
    module: BusinessModule,
    filters: ReceiptFilters = {},
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where = this.buildWhere(businessId, module, filters);
    const [data, total] = await Promise.all([
      this.prisma.receipt.findMany({
        where,
        include: this.receiptInclude,
        orderBy: { createdAt: 'desc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.receipt.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string, module: BusinessModule) {
    const receipt = await this.prisma.receipt.findFirst({
      where: this.buildWhere(businessId, module, { id } as ReceiptFilters & { id: string }),
      include: this.receiptInclude,
    });
    if (!receipt) throw new NotFoundException(`Receipt #${id} not found`);
    return receipt;
  }

  async markPrinted(id: string, businessId: string, module: BusinessModule) {
    await this.findOne(id, businessId, module);
    await this.prisma.receipt.update({
      where: { id },
      data: { printedAt: new Date() },
    });
    return this.findOne(id, businessId, module);
  }

  private buildWhere(
    businessId: string,
    module: BusinessModule,
    filters: ReceiptFilters & { id?: string },
  ): Prisma.ReceiptWhereInput {
    return {
      businessId,
      ...(filters.id ? { id: filters.id } : {}),
      ...(filters.saleId ? { saleId: filters.saleId } : {}),
      ...(filters.posOrderId ? { posOrderId: filters.posOrderId } : {}),
      ...(filters.paymentId ? { paymentId: filters.paymentId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            },
          }
        : {}),
      OR: [
        { sale: { module } },
        { posOrder: { module } },
      ],
    };
  }

  private readonly receiptInclude = {
    sale: { select: { id: true, transactionNumber: true, module: true, status: true } },
    posOrder: { select: { id: true, orderNumber: true, orderType: true, module: true, status: true } },
    payment: { select: { id: true, paymentNumber: true, method: true, status: true, amountPaid: true } },
  };
}
