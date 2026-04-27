import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';
import { Order } from '@modules/orders/entities/order.entity';

export enum PaymentMethod {
  CASH          = 'cash',
  CARD          = 'card',
  MOBILE_MONEY  = 'mobile_money',
  VOUCHER       = 'voucher',
  SPLIT         = 'split',
}

export enum PaymentStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  FAILED    = 'failed',
  REFUNDED  = 'refunded',
}

@Entity('payments')
@Index(['orderId'])
@Index(['status'])
@Index(['method'])
export class Payment extends BaseTimestampEntity {
  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'amount_tendered', type: 'numeric', precision: 12, scale: 2, nullable: true })
  amountTendered?: number;

  @Column({ name: 'change_due', type: 'numeric', precision: 12, scale: 2, nullable: true })
  changeDue?: number;

  @Column({ name: 'reference_number', nullable: true })
  referenceNumber?: string;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse?: Record<string, unknown>;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date;
}
