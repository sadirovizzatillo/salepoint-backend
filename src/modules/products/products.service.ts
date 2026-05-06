import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

import { Product, Category } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RequestImageUploadDto } from './dto/image-upload.dto';
import { StorageService } from '@modules/storage/storage.service';
import {
  paginate,
  PaginatedResult,
  PaginationQueryDto,
} from '@common/utils/pagination.util';

@Injectable()
export class ProductsService {
  private readonly CACHE_TTL = 60;
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly storage: StorageService,
  ) {}

  private withImageUrl<T extends { imageUrl?: string | null } | null | undefined>(
    product: T,
  ): T {
    if (product && product.imageUrl) {
      return { ...product, imageUrl: this.storage.publicUrl(product.imageUrl) };
    }
    return product;
  }

  private cacheKey(shopId: string | null, id: string): string {
    return shopId ? `shop:${shopId}:product:${id}` : `product:${id}`;
  }

  async create(dto: CreateProductDto, shopId: string): Promise<Product> {
    const exists = await this.productRepo.findOne({ where: { shopId, sku: dto.sku } });
    if (exists) throw new ConflictException(`SKU "${dto.sku}" already exists in this shop`);

    const product = this.productRepo.create({ ...dto, shopId });
    const saved = await this.productRepo.save(product);
    await this.cache.del(this.cacheKey(shopId, saved.id));
    return this.withImageUrl(saved);
  }

  async findAll(
    shopId: string | null,
    query: PaginationQueryDto & { categoryId?: string; active?: boolean },
  ): Promise<PaginatedResult<Product>> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndMapOne('p.stock', 'stock_levels', 'sl', 'sl.product_id = p.id')
      .orderBy('p.name', 'ASC');

    if (shopId) qb.andWhere('p.shopId = :shopId', { shopId });
    if (query.search) {
      qb.andWhere(
        'p.name ILIKE :s OR p.sku ILIKE :s OR p.barcode ILIKE :s',
        { s: `%${query.search}%` },
      );
    }
    if (query.categoryId) qb.andWhere('p.categoryId = :cid', { cid: query.categoryId });
    if (query.active !== undefined) qb.andWhere('p.isActive = :a', { a: query.active });

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return paginate(items.map((p) => this.withImageUrl(p)), total, query);
  }

  private async findRawById(id: string, shopId?: string | null): Promise<Product> {
    const key = this.cacheKey(shopId ?? null, id);
    const cached = await this.cache.get<Product>(key);
    if (cached) return cached;

    const where: FindOptionsWhere<Product> = { id };
    if (shopId) where.shopId = shopId;

    const product = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndMapOne('p.stock', 'stock_levels', 'sl', 'sl.product_id = p.id')
      .where(where)
      .getOne();
    if (!product) throw new NotFoundException('Product not found');

    await this.cache.set(key, product, this.CACHE_TTL);
    return product;
  }

  async findById(id: string, shopId?: string | null): Promise<Product> {
    const product = await this.findRawById(id, shopId);
    return this.withImageUrl(product);
  }

  async findByBarcode(barcode: string, shopId: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { barcode, shopId },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.withImageUrl(product);
  }

  async update(id: string, dto: UpdateProductDto, shopId: string): Promise<Product> {
    const product = await this.findRawById(id, shopId);
    Object.assign(product, dto);
    const saved = await this.productRepo.save(product);
    await this.cache.del(this.cacheKey(shopId, id));
    return this.withImageUrl(saved);
  }

  async remove(id: string, shopId: string): Promise<void> {
    const product = await this.findRawById(id, shopId);
    await this.productRepo.softDelete(id);
    if (product.imageUrl) {
      this.storage.deleteObject(product.imageUrl).catch((err) => {
        this.logger.warn(`Failed to delete image ${product.imageUrl}: ${err.message}`);
      });
    }
    await this.cache.del(this.cacheKey(shopId, id));
  }

  // ── Image upload (presigned-URL flow) ──────────────────────────────────────

  async createImageUploadUrl(
    productId: string,
    shopId: string,
    dto: RequestImageUploadDto,
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    await this.findRawById(productId, shopId);
    const ext = dto.contentType === 'image/jpeg' ? 'jpg' : dto.contentType.split('/')[1];
    const key = this.storage.buildProductKey(shopId, productId, ext);
    const { uploadUrl, expiresIn } = await this.storage.createPresignedPut({
      key,
      contentType: dto.contentType,
    });
    return { uploadUrl, key, expiresIn };
  }

  async confirmImage(productId: string, shopId: string, key: string): Promise<Product> {
    const expectedPrefix = `shops/${shopId}/products/${productId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new ForbiddenException('Key does not belong to this product');
    }
    await this.storage.headObject(key);

    const product = await this.findRawById(productId, shopId);
    const oldKey = product.imageUrl;
    product.imageUrl = key;
    const saved = await this.productRepo.save(product);

    if (oldKey && oldKey !== key) {
      this.storage.deleteObject(oldKey).catch((err) => {
        this.logger.warn(`Failed to delete old image ${oldKey}: ${err.message}`);
      });
    }
    await this.cache.del(this.cacheKey(shopId, productId));
    return this.withImageUrl(saved);
  }

  async removeImage(productId: string, shopId: string): Promise<Product> {
    const product = await this.findRawById(productId, shopId);
    const oldKey = product.imageUrl;
    if (!oldKey) return this.withImageUrl(product);

    product.imageUrl = undefined;
    const saved = await this.productRepo.save(product);
    this.storage.deleteObject(oldKey).catch((err) => {
      this.logger.warn(`Failed to delete image ${oldKey}: ${err.message}`);
    });
    await this.cache.del(this.cacheKey(shopId, productId));
    return this.withImageUrl(saved);
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async findAllCategories(shopId: string): Promise<Array<Category & { productCount: number }>> {
    const rows = await this.categoryRepo
      .createQueryBuilder('cat')
      .leftJoin('cat.products', 'p', 'p.shopId = :shopId AND p.isActive = true', { shopId })
      .addSelect('COUNT(p.id)', 'productCount')
      .where('cat.shopId = :shopId', { shopId })
      .groupBy('cat.id')
      .orderBy('cat.name', 'ASC')
      .getRawAndEntities();

    return rows.entities.map((cat, i) =>
      Object.assign(cat, {
        productCount: parseInt(rows.raw[i]?.productCount ?? '0', 10),
      }),
    );
  }

  async createCategory(
    shopId: string,
    name: string,
    description?: string,
    parentId?: string,
  ): Promise<Category> {
    const cat = this.categoryRepo.create({ shopId, name, description, parentId });
    return this.categoryRepo.save(cat);
  }
}
