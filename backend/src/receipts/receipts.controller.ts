import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { BusinessModule } from '@prisma/client';
import { resolveModule } from '../auth/assert-module-allowed';
import { BusinessModulesGuard } from '../auth/business-modules.guard';
import { RequiredBusinessModules } from '../auth/business-modules.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
@UseGuards(JwtAuthGuard, RolesGuard, BusinessModulesGuard)
@Roles('Admin', 'Manager', 'Staff')
@RequiredBusinessModules()
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: BusinessModule,
    @Query('saleId') saleId?: string,
    @Query('posOrderId') posOrderId?: string,
    @Query('paymentId') paymentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.receiptsService.findAll(
      user.businessId,
      resolveModule(user, module),
      { saleId, posOrderId, paymentId, dateFrom, dateTo },
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
    return this.receiptsService.findOne(
      id,
      user.businessId,
      resolveModule(user, module),
    );
  }

  @Patch(':id/printed')
  markPrinted(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: BusinessModule,
  ) {
    return this.receiptsService.markPrinted(
      id,
      user.businessId,
      resolveModule(user, module),
    );
  }
}
