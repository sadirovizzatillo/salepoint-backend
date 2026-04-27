import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  StockLevel,
  StockMovement,
  StockMovementType,
} from './entities/inventory.entity';
import { StorageItem } from './entities/storage.entity';
import { AddStorageDto } from './dto/add-storage.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Product } from '@modules/products/entities/product.entity';
import {
  paginate,
  PaginatedResult,
  PaginationQueryDto,
} from '@common/utils/pagination.util';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(StockLevel)
    private readonly stockLevelRepo: Repository<StockLevel>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(StorageItem)
    private readonly storageRepo: Repository<StorageItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // ── Storage (batch receiving) ──────────────────────────────────────────────

  async addToStorage(dto: AddStorageDto, performedBy: string, shopId: string): Promise<StorageItem> {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId, shopId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const sellingPrice =
      dto.sellingPrice ?? Number((dto.costPrice * (1 + dto.margin / 100)).toFixed(2));

    const storageItem = this.storageRepo.create({
      shopId,
      productId: dto.productId,
      quantity: dto.quantity,
      initialQuantity: dto.quantity,
      costPrice: dto.costPrice,
      margin: dto.margin,
      sellingPrice,
      notes: dto.notes,
    });
    const saved = await this.storageRepo.save(storageItem);

    const level = await this.upsertStockLevel(dto.productId, shopId);
    level.quantityOnHand += dto.quantity;
    await this.stockLevelRepo.save(level);

    await this.movementRepo.save({
      shopId,
      productId: dto.productId,
      type: StockMovementType.PURCHASE,
      quantity: dto.quantity,
      quantityAfter: level.quantityOnHand,
      notes: dto.notes,
      performedBy,
    });

    if (dto.syncProductPrice !== false) {
      await this.productRepo.update(dto.productId, { price: sellingPrice });
    }

    return saved;
  }

  async getStorageBatches(
    productId: string,
    shopId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<StorageItem>> {
    const [items, total] = await this.storageRepo.findAndCount({
      where: { shopId, productId },
      order: { createdAt: 'ASC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginate(items, total, query);
  }

  // ── Stock levels ───────────────────────────────────────────────────────────

  async getStockLevel(productId: string, shopId: string): Promise<StockLevel> {
    const level = await this.stockLevelRepo.findOne({ where: { shopId, productId } });
    if (!level) throw new NotFoundException('Stock record not found for product');
    return level;
  }

  async reserveStock(
    productId: string,
    quantity: number,
    em?: EntityManager,
  ): Promise<void> {
    const repo = em ? em.getRepository(StockLevel) : this.stockLevelRepo;

    const level = await repo
      .createQueryBuilder('sl')
      .setLock('pessimistic_write')
      .where('sl.productId = :productId', { productId })
      .getOne();

    if (!level) throw new NotFoundException('Stock record not found');
    if (level.quantityOnHand - level.quantityReserved < quantity) {
      throw new BadRequestException(`Insufficient stock for product ${productId}`);
    }

    level.quantityReserved += quantity;
    await repo.save(level);

    await (em ? em.getRepository(StockMovement) : this.movementRepo).save({
      shopId: level.shopId,
      productId,
      type: StockMovementType.RESERVE,
      quantity: -quantity,
      quantityAfter: level.quantityOnHand,
    });
  }

  async releaseStock(
    productId: string,
    quantity: number,
    em?: EntityManager,
  ): Promise<void> {
    const repo = em ? em.getRepository(StockLevel) : this.stockLevelRepo;
    const level = await repo.findOne({ where: { productId } });
    if (!level) return;

    level.quantityReserved = Math.max(0, level.quantityReserved - quantity);
    await repo.save(level);

    await (em ? em.getRepository(StockMovement) : this.movementRepo).save({
      shopId: level.shopId,
      productId,
      type: StockMovementType.RELEASE,
      quantity,
      quantityAfter: level.quantityOnHand,
    });
  }

  async deductFromStorage(
    productId: string,
    quantity: number,
    reference: string,
    em?: EntityManager,
  ): Promise<void> {
    const storageRepo  = em ? em.getRepository(StorageItem)   : this.storageRepo;
    const levelRepo    = em ? em.getRepository(StockLevel)    : this.stockLevelRepo;
    const movementRepo = em ? em.getRepository(StockMovement) : this.movementRepo;

    const batches = await storageRepo
      .createQueryBuilder('s')
      .setLock('pessimistic_write')
      .where('s.productId = :productId', { productId })
      .andWhere('s.quantity > 0')
      .orderBy('s.createdAt', 'ASC')
      .getMany();

    let remaining = quantity;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct    = Math.min(batch.quantity, remaining);
      batch.quantity -= deduct;
      remaining      -= deduct;
      await storageRepo.save(batch);
    }

    if (remaining > 0) {
      throw new BadRequestException(`Insufficient storage stock for product ${productId}`);
    }

    const level = await levelRepo.findOne({ where: { productId } });
    if (level) {
      level.quantityOnHand  -= quantity;
      level.quantityReserved = Math.max(0, level.quantityReserved - quantity);
      await levelRepo.save(level);
    }

    await movementRepo.save({
      shopId: level?.shopId,
      productId,
      type: StockMovementType.SALE,
      quantity: -quantity,
      quantityAfter: level ? level.quantityOnHand : 0,
      reference,
    });
  }

  async returnToStorage(
    productId: string,
    quantity: number,
    sellingPrice: number,
    reference: string,
    performedBy: string,
    em?: EntityManager,
  ): Promise<void> {
    const storageRepo  = em ? em.getRepository(StorageItem)   : this.storageRepo;
    const levelRepo    = em ? em.getRepository(StockLevel)    : this.stockLevelRepo;
    const movementRepo = em ? em.getRepository(StockMovement) : this.movementRepo;

    const level = await this.upsertStockLevel(productId, undefined, levelRepo);

    await storageRepo.save(
      storageRepo.create({
        shopId: level.shopId,
        productId,
        quantity,
        initialQuantity: quantity,
        costPrice: 0,
        margin: 0,
        sellingPrice,
        notes: `Return — ref: ${reference}`,
      }),
    );

    level.quantityOnHand += quantity;
    await levelRepo.save(level);

    await movementRepo.save({
      shopId: level.shopId,
      productId,
      type: StockMovementType.RETURN,
      quantity,
      quantityAfter: level.quantityOnHand,
      reference,
      performedBy,
    });
  }

  async adjust(dto: AdjustStockDto, performedBy: string, shopId: string): Promise<StockLevel> {
    const level = await this.stockLevelRepo.findOne({
      where: { shopId, productId: dto.productId },
    });
    if (!level) throw new NotFoundException('Stock record not found');

    const delta = dto.quantity - level.quantityOnHand;

    if (delta > 0) {
      await this.storageRepo.save(
        this.storageRepo.create({
          shopId,
          productId: dto.productId,
          quantity: delta,
          initialQuantity: delta,
          costPrice: 0,
          margin: 0,
          sellingPrice: 0,
          notes: dto.notes ?? 'Manual stock adjustment (positive correction)',
        }),
      );
    } else if (delta < 0) {
      const batches = await this.storageRepo
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.productId = :productId', { productId: dto.productId })
        .andWhere('s.quantity > 0')
        .orderBy('s.createdAt', 'ASC')
        .getMany();

      let remaining = Math.abs(delta);
      for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct    = Math.min(batch.quantity, remaining);
        batch.quantity -= deduct;
        remaining      -= deduct;
        await this.storageRepo.save(batch);
      }
    }

    level.quantityOnHand = dto.quantity;
    const saved = await this.stockLevelRepo.save(level);

    await this.movementRepo.save({
      shopId,
      productId: dto.productId,
      type: StockMovementType.ADJUST,
      quantity: delta,
      quantityAfter: dto.quantity,
      notes: dto.notes,
      performedBy,
    });

    return saved;
  }

  async findMovements(
    productId: string,
    shopId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<StockMovement>> {
    const [items, total] = await this.movementRepo.findAndCount({
      where: { shopId, productId },
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginate(items, total, query);
  }

  async getWarehouse(
    shopId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<StockLevel>> {
    const qb = this.stockLevelRepo
      .createQueryBuilder('sl')
      .leftJoinAndSelect('sl.product', 'p')
      .leftJoinAndSelect('p.category', 'cat')
      .where('sl.shopId = :shopId', { shopId })
      .andWhere('p.isActive = true')
      .orderBy('p.name', 'ASC');

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return paginate(items, total, query);
  }

  async getLowStockProducts(shopId: string): Promise<StockLevel[]> {
    return this.stockLevelRepo
      .createQueryBuilder('sl')
      .leftJoinAndSelect('sl.product', 'p')
      .where('sl.shopId = :shopId', { shopId })
      .andWhere('sl.quantityOnHand <= sl.reorderPoint')
      .andWhere('p.trackStock = true')
      .andWhere('p.isActive = true')
      .getMany();
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private async upsertStockLevel(
    productId: string,
    shopId?: string,
    repo?: Repository<StockLevel>,
  ): Promise<StockLevel> {
    const r = repo ?? this.stockLevelRepo;
    const where = shopId ? { productId, shopId } : { productId };
    const existing = await r.findOne({ where });
    if (existing) return existing;
    return r.create({ shopId, productId, quantityOnHand: 0, quantityReserved: 0 });
  }
}
