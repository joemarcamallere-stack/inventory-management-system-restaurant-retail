import { BadRequestException, Injectable } from '@nestjs/common';
import { BusinessModule, POSPaymentStatus, Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PeriodReportQueryDto,
  ReportQueryDto,
  TopReportQueryDto,
} from './dto/report-query.dto';

type ResolvedReportFilters = {
  from: Date;
  to: Date;
  locationId?: string;
  module?: BusinessModule;
  cashierId?: string;
  status?: SaleStatus;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async salesSummary(businessId: string, query: ReportQueryDto) {
    const filters = this.resolveFilters(query);
    const saleWhere = this.saleWhere(businessId, filters, 'createdAt');
    const refundWhere = this.refundWhere(businessId, filters);

    const [gross, refund, transactionCount, voidCount] = await Promise.all([
      this.prisma.sale.aggregate({
        where: saleWhere,
        _sum: { total: true, discount: true, tax: true },
      }),
      this.prisma.sale.aggregate({
        where: refundWhere,
        _sum: { total: true },
      }),
      this.prisma.sale.count({ where: saleWhere }),
      filters.module === BusinessModule.RETAIL
        ? Promise.resolve(0)
        : this.prisma.kitchenOrder.count({
            where: {
              businessId,
              status: 'VOIDED',
              voidedAt: { gte: filters.from, lt: filters.to },
              ...(filters.locationId ? { locationId: filters.locationId } : {}),
            },
          }),
    ]);

    const grossSales = gross._sum.total ?? 0;
    const totalRefunds = refund._sum.total ?? 0;

    return {
      from: filters.from.toISOString(),
      to: filters.to.toISOString(),
      grossSales,
      discounts: gross._sum.discount ?? 0,
      tax: gross._sum.tax ?? 0,
      netSales: grossSales - totalRefunds,
      transactionCount,
      averageTicket: transactionCount > 0 ? grossSales / transactionCount : 0,
      totalRefunds,
      totalVoids: voidCount,
    };
  }

  async salesByPaymentMethod(businessId: string, query: ReportQueryDto) {
    const filters = this.resolveFilters(query);
    const rows = await this.prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: this.saleWhere(businessId, filters, 'createdAt'),
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    });

    return rows.map((row) => ({
      paymentMethod: row.paymentMethod,
      transactionCount: row._count._all,
      grossSales: row._sum.total ?? 0,
    }));
  }

  async salesByItem(businessId: string, query: TopReportQueryDto) {
    const filters = this.resolveFilters(query);
    const rows = await this.prisma.saleItem.groupBy({
      by: ['inventoryItemId', 'name'],
      where: {
        sale: this.saleWhere(businessId, filters, 'createdAt'),
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: query.limit ?? 20,
    });

    return rows.map((row) => ({
      inventoryItemId: row.inventoryItemId,
      name: row.name,
      quantitySold: row._sum.quantity ?? 0,
      grossSales: row._sum.totalPrice ?? 0,
    }));
  }

  async salesByLocation(businessId: string, query: ReportQueryDto) {
    const filters = this.resolveFilters(query);
    const rows = await this.prisma.sale.groupBy({
      by: ['locationId'],
      where: this.saleWhere(businessId, filters, 'createdAt'),
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    });
    const locationIds = rows.map((row) => row.locationId);
    const locations = await this.prisma.location.findMany({
      where: { businessId, id: { in: locationIds } },
      select: { id: true, name: true },
    });
    const locationNameById = new Map(locations.map((location) => [location.id, location.name]));

    return rows.map((row) => ({
      locationId: row.locationId,
      locationName: locationNameById.get(row.locationId) ?? 'Unknown location',
      transactionCount: row._count._all,
      grossSales: row._sum.total ?? 0,
    }));
  }

  async salesByCashier(businessId: string, query: ReportQueryDto) {
    const filters = this.resolveFilters(query);
    const rows = await this.prisma.sale.groupBy({
      by: ['cashierId'],
      where: this.saleWhere(businessId, filters, 'createdAt'),
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    });
    const cashierIds = rows.flatMap((row) => (row.cashierId ? [row.cashierId] : []));
    const cashiers = await this.prisma.user.findMany({
      where: { businessId, id: { in: cashierIds } },
      select: { id: true, name: true, email: true },
    });
    const cashierById = new Map(cashiers.map((cashier) => [cashier.id, cashier]));

    return rows.map((row) => {
      const cashier = row.cashierId ? cashierById.get(row.cashierId) : null;
      return {
        cashierId: row.cashierId,
        cashierName: cashier?.name ?? cashier?.email ?? 'Unassigned',
        transactionCount: row._count._all,
        grossSales: row._sum.total ?? 0,
      };
    });
  }

  async salesByOrderType(businessId: string, query: ReportQueryDto) {
    const filters = this.resolveFilters(query);
    const rows = await this.prisma.pOSOrder.groupBy({
      by: ['orderType'],
      where: this.posOrderWhere(businessId, filters),
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    });

    return rows.map((row) => ({
      orderType: row.orderType,
      orderCount: row._count._all,
      grossSales: row._sum.total ?? 0,
    }));
  }

  async salesByPeriod(businessId: string, query: PeriodReportQueryDto) {
    const filters = this.resolveFilters(query);
    const granularity = query.granularity ?? 'day';
    const createdConditions = this.rawSaleConditions(
      businessId,
      filters,
      Prisma.sql`s."createdAt"`,
    );
    const refundedConditions = this.rawSaleConditions(
      businessId,
      filters,
      Prisma.sql`s."refundedAt"`,
      true,
    );

    const rows = await this.prisma.$queryRaw<
      { period: Date; gross_sales: number; refunds: number; net_sales: number }[]
    >`
      WITH gross AS (
        SELECT date_trunc(${granularity}, s."createdAt") AS period,
               COALESCE(SUM(s."total"), 0)::float AS gross_sales
        FROM "Sale" s
        WHERE ${createdConditions}
        GROUP BY 1
      ),
      refunds AS (
        SELECT date_trunc(${granularity}, s."refundedAt") AS period,
               COALESCE(SUM(s."total"), 0)::float AS refunds
        FROM "Sale" s
        WHERE ${refundedConditions}
        GROUP BY 1
      )
      SELECT COALESCE(g.period, r.period) AS period,
             COALESCE(g.gross_sales, 0)::float AS gross_sales,
             COALESCE(r.refunds, 0)::float AS refunds,
             (COALESCE(g.gross_sales, 0) - COALESCE(r.refunds, 0))::float AS net_sales
      FROM gross g
      FULL OUTER JOIN refunds r ON r.period = g.period
      ORDER BY period ASC
    `;

    return rows.map((row) => ({
      period: row.period.toISOString(),
      grossSales: Number(row.gross_sales),
      refunds: Number(row.refunds),
      netSales: Number(row.net_sales),
    }));
  }

  private resolveFilters(query: ReportQueryDto): ResolvedReportFilters {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    defaultFrom.setHours(0, 0, 0, 0);

    const from = query.from ? new Date(query.from) : defaultFrom;
    const to = query.to ? new Date(query.to) : now;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid report date range');
    }
    if (from >= to) {
      throw new BadRequestException('Report "from" must be before "to"');
    }
    const maxRangeMs = 370 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxRangeMs) {
      throw new BadRequestException('Report date range cannot exceed 370 days');
    }

    return {
      from,
      to,
      locationId: query.locationId,
      module: query.module,
      cashierId: query.cashierId,
      status: query.status,
    };
  }

  private saleWhere(
    businessId: string,
    filters: ResolvedReportFilters,
    dateField: 'createdAt' | 'refundedAt',
  ): Prisma.SaleWhereInput {
    return {
      businessId,
      [dateField]: { gte: filters.from, lt: filters.to },
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.cashierId ? { cashierId: filters.cashierId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
  }

  private refundWhere(
    businessId: string,
    filters: ResolvedReportFilters,
  ): Prisma.SaleWhereInput {
    return {
      ...this.saleWhere(businessId, filters, 'refundedAt'),
      ...(filters.status
        ? {}
        : { status: { in: [SaleStatus.REFUNDED, SaleStatus.PARTIAL_REFUND] } }),
    };
  }

  private posOrderWhere(
    businessId: string,
    filters: ResolvedReportFilters,
  ): Prisma.POSOrderWhereInput {
    return {
      businessId,
      createdAt: { gte: filters.from, lt: filters.to },
      paymentStatus: {
        in: [
          POSPaymentStatus.PAID,
          POSPaymentStatus.REFUNDED,
          POSPaymentStatus.PARTIALLY_REFUNDED,
        ],
      },
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.cashierId ? { createdById: filters.cashierId } : {}),
    };
  }

  private rawSaleConditions(
    businessId: string,
    filters: ResolvedReportFilters,
    dateColumn: Prisma.Sql,
    refundOnly = false,
  ) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`s."businessId" = ${businessId}`,
      Prisma.sql`${dateColumn} >= ${filters.from}`,
      Prisma.sql`${dateColumn} < ${filters.to}`,
    ];

    if (filters.locationId) conditions.push(Prisma.sql`s."locationId" = ${filters.locationId}`);
    if (filters.module) conditions.push(Prisma.sql`s."module" = ${filters.module}`);
    if (filters.cashierId) conditions.push(Prisma.sql`s."cashierId" = ${filters.cashierId}`);
    if (filters.status) {
      conditions.push(Prisma.sql`s."status" = ${filters.status}`);
    } else if (refundOnly) {
      conditions.push(
        Prisma.sql`s."status" IN (${SaleStatus.REFUNDED}, ${SaleStatus.PARTIAL_REFUND})`,
      );
    }

    return Prisma.join(conditions, ' AND ');
  }
}
