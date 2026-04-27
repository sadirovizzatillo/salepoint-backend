import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';
import { Order } from '@modules/orders/entities/order.entity';
import { Customer } from '@modules/customers/entities/customer.entity';
import { User } from '@modules/users/entities/user.entity';

export enum DebtStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID    = 'paid',
}

@Entity('debts')
@Index(['shopId'])
@Index(['customerId'])
@Index(['cashierId'])
@Index(['status'])
export class Debt extends BaseTimestampEntity {
  @Column({ name: 'shop_id', nullable: true })
  shopId: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'cashier_id' })
  cashierId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'cashier_id' })
  cashier: User;

  @Column({ name: 'total_debt', type: 'numeric', precision: 12, scale: 2 })
  totalDebt: number;

  @Column({ name: 'paid_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'remaining_amount', type: 'numeric', precision: 12, scale: 2 })
  remainingAmount: number;

  @Column({ type: 'enum', enum: DebtStatus, default: DebtStatus.PENDING })
  status: DebtStatus;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @OneToMany(() => DebtRepayment, (r) => r.debt)
  repayments: DebtRepayment[];
}

@Entity('debt_repayments')
@Index(['debtId'])
@Index(['cashierId'])
export class DebtRepayment extends BaseTimestampEntity {
  @Column({ name: 'debt_id' })
  debtId: string;

  @ManyToOne(() => Debt, (d) => d.repayments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'debt_id' })
  debt: Debt;

  @Column({ name: 'cashier_id' })
  cashierId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'cashier_id' })
  cashier: User;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ nullable: true, type: 'text' })
  note?: string;
}
