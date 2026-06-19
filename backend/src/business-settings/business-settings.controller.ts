import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BusinessSettingsService } from './business-settings.service';
import { UpsertBusinessSettingDto } from './dto/upsert-business-setting.dto';

@Controller('business-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'Manager', 'Staff')
export class BusinessSettingsController {
  constructor(private readonly settingsService: BusinessSettingsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.findAll(user.businessId);
  }

  @Put(':key')
  @Roles('Admin', 'Manager')
  upsert(
    @Param('key') key: string,
    @Body() dto: UpsertBusinessSettingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.upsert(key, dto.value, user.businessId);
  }
}
