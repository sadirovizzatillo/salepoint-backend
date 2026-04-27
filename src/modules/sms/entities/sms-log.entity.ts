import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum SmsStatus {
  PENDING   = 'pending',
  SENT      = 'sent',
  DELIVERED = 'delivered',
  FAILED    = 'failed',
}

@Entity('sms_logs')
@Index(['shopId'])
@Index(['customerId'])
@Index(['debtId'])
@Index(['status'])
export class SmsLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
  @Column({ name: 'shop_id', type: 'uuid', nullable: true })
  shopId: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string;

  @Column({ name: 'debt_id', type: 'uuid', nullable: true })
  debtId: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: SmsStatus, default: SmsStatus.PENDING })
  status: SmsStatus;

  @Column({ length: 30, default: 'devsms' })
  provider: string;

  @Column({ name: 'provider_sms_id', nullable: true })
  providerSmsId: number;

  @Column({ name: 'provider_request_id', length: 100, nullable: true })
  providerRequestId: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date;
}
