import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { BusinessModule } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { BusinessModulesGuard } from '../auth/business-modules.guard';
import { RequiredBusinessModules } from '../auth/business-modules.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { resolveModule } from '../auth/assert-module-allowed';
import { UpsertPOSSettingDto } from './dto/upsert-pos-setting.dto';
import { POSSettingsService } from './pos-settings.service';

@Controller('pos-settings')
@UseGuards(JwtAuthGuard, RolesGuard, BusinessModulesGuard)
@Roles('Admin', 'Manager', 'Staff')
@RequiredBusinessModules()
export class POSSettingsController {
  constructor(private readonly settingsService: POSSettingsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('module') module?: BusinessModule,
  ) {
    return this.settingsService.findAll(
      user.businessId,
      module ? resolveModule(user, module) : undefined,
    );
  }

  @Put(':module/:key')
  @Roles('Admin', 'Manager')
  upsert(
    @Param('module') module: BusinessModule,
    @Param('key') key: string,
    @Body() dto: UpsertPOSSettingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.upsert(
      key,
      dto.value,
      user.businessId,
      resolveModule(user, module),
    );
  }
}
