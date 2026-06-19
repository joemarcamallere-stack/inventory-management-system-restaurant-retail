import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BusinessModule } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { BusinessModulesGuard } from '../auth/business-modules.guard';
import { RequiredBusinessModules } from '../auth/business-modules.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { resolveModule } from '../auth/assert-module-allowed';
import {
  PeriodReportQueryDto,
  ReportQueryDto,
  TopReportQueryDto,
} from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, BusinessModulesGuard)
@Roles('Admin', 'Manager')
@RequiredBusinessModules()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  salesSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.salesSummary(
      user.businessId,
      this.withResolvedModule(user, query),
    );
  }

  @Get('sales-by-period')
  salesByPeriod(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PeriodReportQueryDto,
  ) {
    return this.reportsService.salesByPeriod(
      user.businessId,
      this.withResolvedModule(user, query),
    );
  }

  @Get('sales-by-payment-method')
  salesByPaymentMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.salesByPaymentMethod(
      user.businessId,
      this.withResolvedModule(user, query),
    );
  }

  @Get('sales-by-item')
  salesByItem(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TopReportQueryDto,
  ) {
    return this.reportsService.salesByItem(
      user.businessId,
      this.withResolvedModule(user, query),
    );
  }

  @Get('sales-by-location')
  salesByLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.salesByLocation(
      user.businessId,
      this.withResolvedModule(user, query),
    );
  }

  @Get('sales-by-cashier')
  salesByCashier(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.salesByCashier(
      user.businessId,
      this.withResolvedModule(user, query),
    );
  }

  @Get('sales-by-order-type')
  salesByOrderType(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.salesByOrderType(
      user.businessId,
      this.withResolvedModule(user, query),
    );
  }

  private withResolvedModule<T extends { module?: BusinessModule }>(
    user: AuthenticatedUser,
    query: T,
  ): T {
    return { ...query, module: resolveModule(user, query.module) };
  }
}
