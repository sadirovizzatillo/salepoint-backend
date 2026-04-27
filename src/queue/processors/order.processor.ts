import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { InventoryService } from '@modules/inventory/inventory.service';
import { OrdersService } from '@modules/orders/orders.service';

@Processor('orders')
export class OrderProcessor {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  @Process('process-payment')
  async handleProcessPayment(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;

    const order = await this.ordersService.findById(orderId);

    // Idempotency guard — if a previous attempt already deducted stock, skip
    if (order.stockDeducted) {
      this.logger.log(`Stock already deducted for order ${orderId}, skipping`);
      return;
    }

    this.logger.log(`Deducting stock for order ${orderId}`);

    try {
      // Run all batch deductions in a single transaction so a mid-flight
      // crash leaves nothing partially applied
      await this.dataSource.transaction(async (em) => {
        for (const item of order.items) {
          await this.inventoryService.deductFromStorage(
            item.productId,
            item.quantity,
            orderId,
            em,
          );
        }
      });

      // Mark the order so retries are safe
      await this.ordersService.markStockDeducted(orderId);
      this.logger.log(`Stock deducted for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to deduct stock for order ${orderId}`, error);
      throw error; // Re-queue for retry — idempotency guard prevents double-deduction
    }
  }
}
