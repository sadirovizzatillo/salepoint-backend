import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseTimestampEntity } from '@database/entities/base.entity';

@Entity('categories')
export class Category extends BaseTimestampEntity {
  @Column({ name: 'shop_id', nullable: true })
  @Index()
  shopId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category;

  @OneToMany(() => Product, (p) => p.category)
  products: Product[];
}

@Entity('products')
// SKU is unique per shop, not globally — composite unique index
@Index(['shopId', 'sku'], { unique: true })
@Index(['barcode'])
export class Product extends BaseTimestampEntity {
  @Column({ name: 'shop_id', nullable: true })
  @Index()
  shopId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ length: 100 })
  sku: string;

  @Column({ nullable: true, length: 100 })
  barcode?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;

  @Column({ name: 'cost_price', type: 'numeric', precision: 12, scale: 2, default: 0 })
  costPrice: number;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'track_stock', default: true })
  trackStock: boolean;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, (c) => c.products, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ type: 'jsonb', nullable: true })
  attributes?: Record<string, unknown>;
}
