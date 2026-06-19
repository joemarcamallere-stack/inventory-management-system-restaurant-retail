import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { POSSettingsController } from './pos-settings.controller';
import { POSSettingsService } from './pos-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [POSSettingsController],
  providers: [POSSettingsService],
  exports: [POSSettingsService],
})
export class POSSettingsModule {}
