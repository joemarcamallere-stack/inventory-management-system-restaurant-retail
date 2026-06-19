import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BusinessModule } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { BusinessModulesGuard } from '../auth/business-modules.guard';
import { RequiredBusinessModules } from '../auth/business-modules.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { resolveModule } from '../auth/assert-module-allowed';
import { CreatePOSOrderDto } from './dto/create-pos-order.dto';
import { CompletePOSOrderPaymentDto } from './dto/complete-pos-order-payment.dto';
import { UpdatePOSOrderStatusDto } from './dto/update-pos-order-status.dto';
import { VoidPOSOrderDto } from './dto/void-pos-order.dto';
import { POSOrdersService } from './pos-orders.service';

@Controller('pos-orders')
@UseGuards(JwtAuthGuard, RolesGuard, BusinessModulesGuard)
@Roles('Admin', 'Manager', 'Staff')
@RequiredBusinessModules()
export class POSOrdersController {
  constructor(private readonly posOrdersService: POSOrdersService) {}

  @Post()
  create(@Body() dto: CreatePOSOrderDto, @CurrentUser() user: AuthenticatedUser) {
    const fallbackModule =
      dto.orderType === 'RETAIL' ? BusinessModule.RETAIL : BusinessModule.RESTAURANT;
    return this.posOrdersService.create(
      dto,
      user.businessId,
      resolveModule(user, dto.module ?? fallbackModule),
      user.id,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: BusinessModule,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('locationId') locationId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posOrdersService.findAll(
      user.businessId,
      resolveModule(user, module),
      status,
      paymentStatus,
      locationId,
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
    return this.posOrdersService.findOne(
      id,
      user.businessId,
      resolveModule(user, module),
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePOSOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: BusinessModule,
  ) {
    return this.posOrdersService.updateStatus(
      id,
      dto.status,
      user.businessId,
      resolveModule(user, module),
      dto.notes,
    );
  }

  @Patch(':id/void')
  void(
    @Param('id') id: string,
    @Body() dto: VoidPOSOrderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: BusinessModule,
  ) {
    return this.posOrdersService.void(
      id,
      dto.voidReason,
      user.businessId,
      resolveModule(user, module),
    );
  }

  @Patch(':id/complete-payment')
  completePayment(
    @Param('id') id: string,
    @Body() dto: CompletePOSOrderPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: BusinessModule,
  ) {
    return this.posOrdersService.completePayment(
      id,
      dto,
      user.businessId,
      resolveModule(user, module),
      user.id,
    );
  }
}
