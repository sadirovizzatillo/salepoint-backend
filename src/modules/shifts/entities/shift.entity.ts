import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';
import { User } from '@modules/users/entities/user.entity';

export enum ShiftStatus {
  OPEN   = 'open',
  CLOSED = 'closed',
}

@Entity('shifts')
@Index(['shopId', 'cashierId', 'status'])
@Index(['shopId'])
@Index(['openedAt'])
export class Shift extends BaseTimestampEntity {
  @Column({ name: 'shop_id', nullable: true })
  shopId: string;

  @Column({ name: 'cashier_id' })
  cashierId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'cashier_id' })
  cashier: User;

  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.OPEN })
  status: ShiftStatus;

  @Column({ name: 'opening_float', type: 'numeric', precision: 12, scale: 2 })
  openingFloat: number;

  @Column({ name: 'closing_float', type: 'numeric', precision: 12, scale: 2, nullable: true })
  closingFloat?: number;

  @Column({ name: 'cash_sales', type: 'numeric', precision: 12, scale: 2, default: 0 })
  cashSales: number;

  @Column({ name: 'card_sales', type: 'numeric', precision: 12, scale: 2, default: 0 })
  cardSales: number;

  @Column({ name: 'total_sales', type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalSales: number;

  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount: number;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @Column({ nullable: true, type: 'text' })
  notes?: string;
}
