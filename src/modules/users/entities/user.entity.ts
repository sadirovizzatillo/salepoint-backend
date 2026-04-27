import {
  Column,
  Entity,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseTimestampEntity } from '@database/entities/base.entity';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
@Index(['email'], { unique: true })
export class User extends BaseTimestampEntity {
  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.CASHIER],
  })
  roles: UserRole[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'pin_hash', nullable: true })
  @Exclude()
  pinHash?: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'shop_limit', type: 'int', default: 0, nullable: true })
  shopLimit: number | null;
}
