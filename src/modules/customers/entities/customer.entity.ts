import { Column, Entity, Index } from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';
import { DiscountType } from '@modules/orders/enums/discount-type.enum';

@Entity('customers')
@Index(['shopId'])
@Index(['phone'])
export class Customer extends BaseTimestampEntity {
  @Column({ name: 'shop_id', nullable: true })
  shopId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ nullable: true, length: 30 })
  phone?: string;

  @Column({ name: 'loyalty_points', type: 'int', default: 0 })
  loyaltyPoints: number;

  @Column({ name: 'total_spent', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ name: 'visit_count', type: 'int', default: 0 })
  visitCount: number;

  // Applied automatically on every order for this customer unless the cashier
  // overrides it. Null = no default discount.
  @Column({ name: 'default_discount_type', type: 'enum', enum: DiscountType, nullable: true })
  defaultDiscountType?: DiscountType;

  @Column({ name: 'default_discount_value', type: 'numeric', precision: 8, scale: 2, nullable: true })
  defaultDiscountValue?: number;

  @Column({ nullable: true, type: 'text' })
  notes?: string;
}
