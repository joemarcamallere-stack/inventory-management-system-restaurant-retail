import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { POSOrdersController } from './pos-orders.controller';
import { POSOrdersService } from './pos-orders.service';

@Module({
  imports: [PrismaModule],
  controllers: [POSOrdersController],
  providers: [POSOrdersService],
  exports: [POSOrdersService],
})
export class POSOrdersModule {}
