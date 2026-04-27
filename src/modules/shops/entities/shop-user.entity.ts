import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Shop } from './shop.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/users/enums/user-role.enum';

/**
 * Junction table — one row per (user, shop) pair.
 * roles[] is the set of roles this user holds specifically inside this shop.
 * A user can appear in multiple shops with different roles in each.
 */
@Entity('shop_users')
@Index(['shopId', 'userId'], { unique: true })
@Index(['userId'])
export class ShopUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shop_id' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.CASHIER],
  })
  roles: UserRole[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
