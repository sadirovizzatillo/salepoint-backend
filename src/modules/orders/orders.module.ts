import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Order, OrderItem } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderProcessor } from '@queue/processors/order.processor';
import { ProductsModule } from '@modules/products/products.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { DebtsModule } from '@modules/debts/debts.module';
import { Customer } from '@modules/customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Customer]),
    BullModule.registerQueue({ name: 'orders' }),
    ProductsModule,
    InventoryModule,
    DebtsModule,
  ],
  providers: [OrdersService, OrderProcessor],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
