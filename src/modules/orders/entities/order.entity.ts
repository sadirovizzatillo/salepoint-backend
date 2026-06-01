import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';
import { Product } from '@modules/products/entities/product.entity';
import { User } from '@modules/users/entities/user.entity';
import { Customer } from '@modules/customers/entities/customer.entity';
import { numericTransformer } from '@common/utils/numeric-transformer';
import { DiscountType } from '../enums/discount-type.enum';

export { DiscountType };

export enum OrderStatus {
  PENDING   = 'pending',
  CONFIRMED = 'confirmed',
  PAID      = 'paid',
  REFUNDED  = 'refunded',
  CANCELLED = 'cancelled',
}

@Entity('orders')
@Index(['orderNumber'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
@Index(['shopId'])
export class Order extends BaseTimestampEntity {
  @Column({ name: 'shop_id', nullable: true })
  shopId: string;

  @Column({ name: 'order_number', unique: true, length: 30 })
  orderNumber: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'subtotal', type: 'numeric', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'total', type: 'numeric', precision: 12, scale: 2 })
  total: number;

  @Column({ name: 'discount_type', type: 'enum', enum: DiscountType, nullable: true })
  discountType?: DiscountType;

  @Column({ name: 'discount_value', type: 'numeric', precision: 8, scale: 2, nullable: true })
  discountValue?: number;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ name: 'paid_by_cash', type: 'numeric', precision: 12, scale: 2, default: 0 })
  paidByCash: number;

  @Column({ name: 'paid_by_card', type: 'numeric', precision: 12, scale: 2, default: 0 })
  paidByCard: number;

  @Column({ name: 'not_paid', type: 'numeric', precision: 12, scale: 2, default: 0 })
  notPaid: number;

  @Column({ name: 'cashier_id', nullable: true })
  cashierId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'cashier_id' })
  cashier?: User;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'shift_id', nullable: true })
  shiftId?: string;

  // True once the Bull job has successfully deducted stock from storage.
  // Used to make the job idempotent on retry.
  @Column({ name: 'stock_deducted', default: false })
  stockDeducted: boolean;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];
}

@Entity('order_items')
export class OrderItem extends BaseTimestampEntity {
  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 200 })
  name: string; // snapshot at time of sale

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number; // snapshot

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity: number;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 12, scale: 2 })
  lineTotal: number;
}
