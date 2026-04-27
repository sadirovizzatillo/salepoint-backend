import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Order, OrderItem, OrderStatus, DiscountType } from './entities/order.entity';
import { Shift } from '@modules/shifts/entities/shift.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ReturnOrderDto } from './dto/return-order.dto';
import { ProductsService } from '@modules/products/products.service';
import { InventoryService } from '@modules/inventory/inventory.service';
import { DebtsService } from '@modules/debts/debts.service';
import {
  paginate,
  PaginatedResult,
  PaginationQueryDto,
} from '@common/utils/pagination.util';
import { ReceiptDto } from './dto/receipt.dto';
import { PrinterService } from '@modules/printer/printer.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
    @InjectQueue('orders')
    private readonly ordersQueue: Queue,
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
    private readonly debtsService: DebtsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
    private readonly printerService: PrinterService,
  ) {}

  async create(
    dto: CreateOrderDto,
    cashierId: string,
    shopId: string,
    isPrintCheck = false,
  ): Promise<Order> {
    return this.dataSource.transaction(async (em) => {
      let subtotal  = 0;
      let taxAmount = 0;
      const items: Partial<OrderItem>[] = [];

      for (const line of dto.items) {
        const product = await this.productsService.findById(line.productId, shopId);
        if (!product.isActive)
          throw new BadRequestException(`Product "${product.name}" is inactive`);

        if (product.trackStock) {
          await this.inventoryService.reserveStock(line.productId, line.quantity, em);
        }

        const lineTotal = product.price * line.quantity;
        const lineTax   = lineTotal * (product.taxRate / 100);
        subtotal  += lineTotal;
        taxAmount += lineTax;

        items.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: line.quantity,
          taxRate: product.taxRate,
          lineTotal,
        });
      }

      let discountAmount = 0;
      if (dto.discountType && dto.discountValue) {
        discountAmount =
          dto.discountType === DiscountType.PERCENT
            ? subtotal * (dto.discountValue / 100)
            : dto.discountValue;
        discountAmount = Math.min(discountAmount, subtotal);
      }

      const total = subtotal + taxAmount - discountAmount;

      const paidByCash = dto.paidByCash ?? 0;
      const paidByCard = dto.paidByCard ?? 0;

      if (paidByCash + paidByCard > total) {
        throw new BadRequestException('Payment amount exceeds order total');
      }

      const notPaid = Number((total - paidByCash - paidByCard).toFixed(2));

      if (notPaid > 0 && !dto.customerId) {
        throw new BadRequestException(
          'customerId is required when order is not fully paid',
        );
      }

      const order = em.create(Order, {
        shopId,
        orderNumber: this.generateOrderNumber(),
        status: notPaid === 0 ? OrderStatus.PAID : OrderStatus.CONFIRMED,
        subtotal,
        taxAmount,
        discountAmount,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        total,
        paidByCash,
        paidByCard,
        notPaid,
        notes: dto.notes,
        cashierId,
        customerId: dto.customerId,
        shiftId: dto.shiftId,
        items: items as OrderItem[],
      });

      const saved = await em.save(Order, order);

      if (notPaid > 0) {
        await this.debtsService.createFromOrder(saved, cashierId, em);
      }

      if (dto.shiftId) {
        await em.getRepository(Shift)
          .createQueryBuilder()
          .update()
          .set({
            cashSales:  () => 'cash_sales + :cash',
            cardSales:  () => 'card_sales + :card',
            totalSales: () => 'total_sales + :total',
            orderCount: () => 'order_count + 1',
          })
          .setParameters({ cash: paidByCash, card: paidByCard, total })
          .where('id = :id', { id: dto.shiftId })
          .execute();
      }

      await this.ordersQueue.add('process-payment', { orderId: saved.id });
      this.eventEmitter.emit('order.created', saved);

      if (isPrintCheck) {
        this.printerService.printReceipt(saved).catch(() => void 0);
      }

      return saved;
    });
  }

  async findAll(
    shopId: string | null,
    query: PaginationQueryDto & { status?: OrderStatus; cashierId?: string; from?: Date; to?: Date },
  ): Promise<PaginatedResult<Order>> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'item')
        .leftJoinAndSelect('o.cashier', 'cashier')
        .leftJoinAndSelect('o.customer', 'customer')
      .orderBy('o.createdAt', 'DESC');

    if (shopId)        qb.andWhere('o.shopId = :shopId', { shopId });
    if (query.status)  qb.andWhere('o.status = :status', { status: query.status });
    if (query.cashierId) qb.andWhere('o.cashierId = :cid', { cid: query.cashierId });
    if (query.from)    qb.andWhere('o.createdAt >= :from', { from: query.from });
    if (query.to)      qb.andWhere('o.createdAt <= :to', { to: query.to });
    if (query.search)  qb.andWhere('o.orderNumber ILIKE :s', { s: `%${query.search}%` });

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return paginate(items, total, query);
  }

  async findByCustomer(
    customerId: string,
    shopId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Order>> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'item')
      .leftJoinAndSelect('o.cashier', 'cashier')
      .where('o.customerId = :customerId', { customerId })
      .andWhere('o.shopId = :shopId', { shopId })
      .orderBy('o.createdAt', 'DESC');

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return paginate(items, total, query);
  }

  async findById(id: string, shopId?: string | null): Promise<Order> {
    const where: FindOptionsWhere<Order> = { id };
    if (shopId) where.shopId = shopId;

    const order = await this.orderRepo.findOne({
      where,
      relations: ['items', 'items.product', 'cashier', 'customer'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancel(id: string, shopId: string): Promise<Order> {
    return this.dataSource.transaction(async (em) => {
      const order = await this.findById(id, shopId);

      if ([OrderStatus.PAID, OrderStatus.REFUNDED].includes(order.status)) {
        throw new BadRequestException('Cannot cancel a paid or refunded order');
      }

      for (const item of order.items) {
        await this.inventoryService.releaseStock(item.productId, item.quantity, em);
      }

      order.status = OrderStatus.CANCELLED;
      const saved = await em.save(Order, order);
      this.eventEmitter.emit('order.cancelled', saved);
      return saved;
    });
  }

  async markPaid(id: string, shopId: string): Promise<Order> {
    const order = await this.findById(id, shopId);
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Order must be in CONFIRMED status to mark as paid');
    }
    order.status = OrderStatus.PAID;
    const saved = await this.orderRepo.save(order);
    this.eventEmitter.emit('order.paid', saved);
    return saved;
  }

  async markStockDeducted(id: string): Promise<void> {
    await this.orderRepo.update(id, { stockDeducted: true });
  }

  async returnOrder(id: string, dto: ReturnOrderDto, cashierId: string, shopId: string): Promise<Order> {
    return this.dataSource.transaction(async (em) => {
      const order = await this.findById(id, shopId);

      if (order.status !== OrderStatus.PAID) {
        throw new BadRequestException('Only paid orders can be returned');
      }

      for (const line of dto.items) {
        const ordered = order.items.find((i) => i.productId === line.productId);
        if (!ordered) {
          throw new BadRequestException(`Product ${line.productId} is not in this order`);
        }
        if (line.quantity > ordered.quantity) {
          throw new BadRequestException(
            `Cannot return more than ordered quantity for product ${line.productId}`,
          );
        }
      }

      for (const line of dto.items) {
        const ordered = order.items.find((i) => i.productId === line.productId)!;
        await this.inventoryService.returnToStorage(
          line.productId,
          line.quantity,
          ordered.price,
          id,
          cashierId,
          em,
        );
      }

      order.status = OrderStatus.REFUNDED;
      const saved = await em.save(Order, order);
      this.eventEmitter.emit('order.refunded', saved);
      return saved;
    });
  }

  async printOrder(id: string, shopId: string): Promise<void> {
    const order = await this.orderRepo.findOne({
      where: { id, shopId },
      relations: ['items', 'cashier', 'customer'],
    });
    if (!order) throw new NotFoundException('Order not found');
    if (![OrderStatus.CONFIRMED, OrderStatus.PAID].includes(order.status)) {
      throw new BadRequestException('Only confirmed or paid orders can be printed');
    }
    await this.printerService.printReceipt(order);
  }

  async getReceipt(id: string, shopId: string): Promise<ReceiptDto> {
    const order = await this.orderRepo.findOne({
      where: { id, shopId },
      relations: ['items', 'cashier', 'customer'],
    });
    if (!order) throw new NotFoundException('Order not found');
    if (![OrderStatus.CONFIRMED, OrderStatus.PAID].includes(order.status)) {
      throw new BadRequestException('Receipt is only available for confirmed or paid orders');
    }

    const paidTotal = Number(order.paidByCash) + Number(order.paidByCard);
    const change    = Math.max(0, paidTotal - Number(order.total));

    return {
      orderNumber:    order.orderNumber,
      date:           order.createdAt,
      cashier:        order.cashier?.name ?? 'Unknown',
      customer:       order.customer?.name,
      items: order.items.map((item) => ({
        name:      item.name,
        quantity:  item.quantity,
        price:     Number(item.price),
        taxRate:   Number(item.taxRate),
        lineTotal: Number(item.lineTotal),
      })),
      subtotal:       Number(order.subtotal),
      taxAmount:      Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      total:          Number(order.total),
      paidByCash:     Number(order.paidByCash),
      paidByCard:     Number(order.paidByCard),
      notPaid:        Number(order.notPaid),
      change,
      status:         order.status,
    };
  }

  private generateOrderNumber(): string {
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${ts}-${rand}`;
  }
}
