import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { InventoryModule } from './inventory/inventory.module';
import { AuthModule } from './auth/auth.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { RecipesModule } from './recipes/recipes.module';
import { KitchenOrdersModule } from './kitchen-orders/kitchen-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    InventoryModule,
    StockMovementsModule,
    RecipesModule,
    KitchenOrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
