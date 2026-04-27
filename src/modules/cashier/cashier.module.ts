import { Module } from '@nestjs/common';
import { CashierController } from './cashier.controller';
import { ProductsModule } from '@modules/products/products.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { ShiftsModule } from '@modules/shifts/shifts.module';

/**
 * CashierModule exposes a focused set of endpoints scoped to cashier.url.com.
 * All routes are protected by JwtAuthGuard + ClientTypeGuard('cashier').
 *
 * Keeps cashier-specific composite actions (quick-sale, receipt, etc.)
 * separate from the core domain modules.
 */
@Module({
  imports: [
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    CustomersModule,
    ShiftsModule,
  ],
  controllers: [CashierController],
})
export class CashierModule {}
