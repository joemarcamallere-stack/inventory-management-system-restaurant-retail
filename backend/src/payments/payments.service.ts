import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessModule, PaymentStatus, Prisma } from '@prisma/client';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

type PaymentFilters = {
  method?: string;
  status?: PaymentStatus;
  saleId?: string;
  posOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    businessId: string,
    module: BusinessModule,
    filters: PaymentFilters = {},
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where = this.buildWhere(businessId, module, filters);
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: this.paymentInclude,
        orderBy: { paidAt: 'desc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.payment.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string, module: BusinessModule) {
    const payment = await this.prisma.payment.findFirst({
      where: this.buildWhere(businessId, module, { id } as PaymentFilters & { id: string }),
      include: this.paymentInclude,
    });
    if (!payment) throw new NotFoundException(`Payment #${id} not found`);
    return payment;
  }

  private buildWhere(
    businessId: string,
    module: BusinessModule,
    filters: PaymentFilters & { id?: string },
  ): Prisma.PaymentWhereInput {
    return {
      businessId,
      ...(filters.id ? { id: filters.id } : {}),
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.saleId ? { saleId: filters.saleId } : {}),
      ...(filters.posOrderId ? { posOrderId: filters.posOrderId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            paidAt: {
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

  private readonly paymentInclude = {
    sale: { select: { id: true, transactionNumber: true, module: true, status: true } },
    posOrder: { select: { id: true, orderNumber: true, orderType: true, module: true, status: true } },
    processedBy: { select: { id: true, name: true } },
    receipts: { select: { id: true, receiptNumber: true, printedAt: true, createdAt: true } },
  };
}
