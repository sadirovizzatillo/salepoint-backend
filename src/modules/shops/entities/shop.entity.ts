import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';

export enum SubscriptionStatus {
  TRIAL     = 'trial',
  ACTIVE    = 'active',
  EXPIRED   = 'expired',
  SUSPENDED = 'suspended',
}

@Entity('shops')
@Index(['subscriptionStatus'])
export class Shop extends BaseTimestampEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ nullable: true, length: 255 })
  address?: string;

  @Column({ nullable: true, length: 30 })
  phone?: string;

  @Column({ nullable: true, length: 255 })
  email?: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @Column({
    name: 'subscription_status',
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  subscriptionStatus: SubscriptionStatus;

  @Column({ name: 'subscription_expires_at', type: 'timestamptz', nullable: true })
  subscriptionExpiresAt?: Date;

  /**
   * Maximum number of cashier-role seats this shop is allowed.
   * null = unlimited (e.g. legacy / enterprise shops).
   * Set by SUPER_ADMIN — used to enforce per-seat billing.
   */
  @Column({ name: 'cashier_limit', type: 'int', nullable: true, default: null })
  cashierLimit?: number | null;
}
