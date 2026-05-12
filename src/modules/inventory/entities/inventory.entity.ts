import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';
import { Product } from '@modules/products/entities/product.entity';
import { numericTransformer } from '@common/utils/numeric-transformer';

export enum StockMovementType {
  PURCHASE  = 'purchase',  // stock received into storage
  SALE      = 'sale',      // deducted after order confirmed
  RETURN    = 'return',
  RESERVE   = 'reserve',   // locked for a pending order
  RELEASE   = 'release',   // reservation lifted (order cancelled)
  ADJUST    = 'adjust',    // manual correction
  TRANSFER  = 'transfer',
}

@Entity('stock_levels')
@Index(['shopId', 'productId'], { unique: true })  // one level per product per shop
export class StockLevel extends BaseTimestampEntity {
  @Column({ name: 'shop_id', nullable: true })
  @Index()
  shopId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    name: 'quantity_on_hand',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  quantityOnHand: number;

  @Column({
    name: 'quantity_reserved',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  quantityReserved: number;

  @Column({
    name: 'reorder_point',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 5,
    transformer: numericTransformer,
  })
  reorderPoint: number;

  get quantityAvailable(): number {
    return this.quantityOnHand - this.quantityReserved;
  }
}

@Entity('stock_movements')
@Index(['shopId'])
@Index(['productId'])
@Index(['type'])
@Index(['createdAt'])
export class StockMovement extends BaseTimestampEntity {
  @Column({ name: 'shop_id', nullable: true })
  shopId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity: number; // positive = in, negative = out

  @Column({
    name: 'quantity_after',
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericTransformer,
  })
  quantityAfter: number;

  @Column({ nullable: true })
  reference?: string; // order id, purchase order id, etc.

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ name: 'performed_by', nullable: true })
  performedBy?: string;
}
