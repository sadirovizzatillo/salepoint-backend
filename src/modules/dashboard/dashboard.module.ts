import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { ReportsModule } from '@modules/reports/reports.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { UsersModule } from '@modules/users/users.module';

/**
 * DashboardModule groups routes exclusively for dashboard.url.com.
 * Clients are validated via ClientTypeGuard('dashboard').
 */
@Module({
  imports: [ReportsModule, InventoryModule, OrdersModule, UsersModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
