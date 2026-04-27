import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { OrdersService } from '@modules/orders/orders.service';
import { OrderStatus } from '@modules/orders/entities/order.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly ordersService: OrdersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async process(dto: ProcessPaymentDto, shopId: string): Promise<Payment> {
    const order = await this.ordersService.findById(dto.orderId, shopId);

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay a cancelled order');
    }

    // Cash change calculation
    let changeDue: number | undefined;
    if (dto.method === PaymentMethod.CASH && dto.amountTendered !== undefined) {
      if (dto.amountTendered < order.total) {
        throw new BadRequestException('Amount tendered is less than order total');
      }
      changeDue = dto.amountTendered - order.total;
    }

    const payment = this.paymentRepo.create({
      orderId: dto.orderId,
      method: dto.method,
      amount: order.total,
      amountTendered: dto.amountTendered,
      changeDue,
      referenceNumber: dto.referenceNumber,
      status: PaymentStatus.COMPLETED,
      processedAt: new Date(),
    });

    const saved = await this.paymentRepo.save(payment);

    // Transition order to PAID
    await this.ordersService.markPaid(dto.orderId, shopId);

    this.eventEmitter.emit('payment.completed', saved);
    return saved;
  }

  async refund(paymentId: string, reason?: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    payment.status = PaymentStatus.REFUNDED;
    const saved = await this.paymentRepo.save(payment);

    this.eventEmitter.emit('payment.refunded', { payment: saved, reason });
    return saved;
  }

  async findByOrder(orderId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }
}
