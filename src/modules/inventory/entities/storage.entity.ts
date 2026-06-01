import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';
import { Product } from '@modules/products/entities/product.entity';
import { numericTransformer } from '@common/utils/numeric-transformer';
import { MarginType } from '../enums/margin-type.enum';

@Entity('storage')
@Index(['productId'])
@Index(['shopId'])
export class StorageItem extends BaseTimestampEntity {
  @Column({ name: 'shop_id', nullable: true })
  shopId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Units remaining in this batch (decreases as items are sold)
  @Column({
    name: 'quantity',
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity: number;

  // Original quantity when this batch was received
  @Column({
    name: 'initial_quantity',
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericTransformer,
  })
  initialQuantity: number;

  // Mahsulot tan narxi — cost price per unit
  @Column({ name: 'cost_price', type: 'numeric', precision: 12, scale: 2 })
  costPrice: number;

  // Mahsulot foizi yoki ustama — markup, interpreted by marginType:
  //   percent → sellingPrice = costPrice * (1 + margin / 100)
  //   fixed   → sellingPrice = costPrice + margin
  @Column({ name: 'margin', type: 'numeric', precision: 12, scale: 2, default: 0 })
  margin: number;

  @Column({
    name: 'margin_type',
    type: 'enum',
    enum: MarginType,
    default: MarginType.PERCENT,
  })
  marginType: MarginType;

  // Sotish narxi — selling price per unit (auto-calc or manual override)
  @Column({ name: 'selling_price', type: 'numeric', precision: 12, scale: 2 })
  sellingPrice: number;

  @Column({ nullable: true, type: 'text' })
  notes?: string;
}
