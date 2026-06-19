import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BusinessModule, PaymentStatus } from '@prisma/client';
import { resolveModule } from '../auth/assert-module-allowed';
import { BusinessModulesGuard } from '../auth/business-modules.guard';
import { RequiredBusinessModules } from '../auth/business-modules.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard, BusinessModulesGuard)
@Roles('Admin', 'Manager', 'Staff')
@RequiredBusinessModules()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: BusinessModule,
    @Query('method') method?: string,
    @Query('status') status?: PaymentStatus,
    @Query('saleId') saleId?: string,
    @Query('posOrderId') posOrderId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findAll(
      user.businessId,
      resolveModule(user, module),
      { method, status, saleId, posOrderId, dateFrom, dateTo },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: BusinessModule,
  ) {
    return this.paymentsService.findOne(
      id,
      user.businessId,
      resolveModule(user, module),
    );
  }
}
