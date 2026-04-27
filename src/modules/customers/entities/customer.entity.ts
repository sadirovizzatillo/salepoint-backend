import { Column, Entity, Index } from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';

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

  @Column({ nullable: true, type: 'text' })
  notes?: string;
}
