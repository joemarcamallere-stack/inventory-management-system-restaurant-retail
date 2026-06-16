import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RefundSaleDto } from './dto/refund-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessModulesGuard } from '../auth/business-modules.guard';
import { RequiredBusinessModules } from '../auth/business-modules.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard, BusinessModulesGuard)
@Roles('Admin', 'Manager', 'Staff')
@RequiredBusinessModules('RETAIL')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.create(dto, user.businessId, user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesService.findAll(
      user.businessId,
      locationId,
      status,
      dateFrom,
      dateTo,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.salesService.findOne(id, user.businessId);
  }

  @Patch(':id/refund')
  @Roles('Admin', 'Manager')
  refund(
    @Param('id') id: string,
    @Body() dto: RefundSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.refund(id, dto.refundReason, user.businessId, user.id);
  }
}
