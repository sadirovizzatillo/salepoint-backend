import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import * as bcrypt from 'bcryptjs';

import { Shop, SubscriptionStatus } from './entities/shop.entity';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { ShopUser } from './entities/shop-user.entity';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateOwnShopDto } from './dto/update-own-shop.dto';
import { AssignUserToShopDto } from './dto/assign-user.dto';
import { User } from '@modules/users/entities/user.entity';
import {
  paginate,
  PaginatedResult,
  PaginationQueryDto,
} from '@common/utils/pagination.util';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(ShopUser)
    private readonly shopUserRepo: Repository<ShopUser>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Shop CRUD ──────────────────────────────────────────────────────────────

  async create(dto: CreateShopDto): Promise<Shop> {
    const shop = this.shopRepo.create({
      ...dto,
      subscriptionExpiresAt: dto.subscriptionExpiresAt
        ? new Date(dto.subscriptionExpiresAt)
        : undefined,
      subscriptionStatus: SubscriptionStatus.TRIAL,
    });
    return this.shopRepo.save(shop);
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<Shop>> {
    const qb = this.shopRepo
      .createQueryBuilder('s')
      .orderBy('s.createdAt', 'DESC');

    if (query.search) {
      qb.where('s.name ILIKE :q OR s.email ILIKE :q', { q: `%${query.search}%` });
    }

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return paginate(items, total, query);
  }

  async findById(id: string): Promise<Shop> {
    const shop = await this.shopRepo.findOne({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(id: string, dto: UpdateShopDto): Promise<Shop> {
    const shop = await this.findById(id);
    Object.assign(shop, {
      ...dto,
      subscriptionExpiresAt: dto.subscriptionExpiresAt
        ? new Date(dto.subscriptionExpiresAt)
        : shop.subscriptionExpiresAt,
    });
    return this.shopRepo.save(shop);
  }

  async suspend(id: string): Promise<Shop> {
    const shop = await this.findById(id);
    shop.subscriptionStatus = SubscriptionStatus.SUSPENDED;
    return this.shopRepo.save(shop);
  }

  async activate(id: string): Promise<Shop> {
    const shop = await this.findById(id);
    shop.subscriptionStatus = SubscriptionStatus.ACTIVE;
    return this.shopRepo.save(shop);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.shopRepo.softDelete(id);
  }

  // ── User assignment ────────────────────────────────────────────────────────

  /**
   * Creates a new platform user and assigns them to the shop with the given roles.
   * Called by SUPER_ADMIN when onboarding a new shop owner.
   * Also used by SHOP_OWNER to create their own staff.
   */
  async assignUser(shopId: string, dto: AssignUserToShopDto): Promise<ShopUser> {
    const shop = await this.findById(shopId);

    // Enforce cashier seat limit when any assigned role is CASHIER
    if (dto.roles.includes(UserRole.CASHIER) && shop.cashierLimit != null) {
      const cashierCount = await this.shopUserRepo
        .createQueryBuilder('su')
        .where('su.shop_id = :shopId', { shopId })
        .andWhere(':role = ANY(su.roles)', { role: UserRole.CASHIER })
        .getCount();

      if (cashierCount >= shop.cashierLimit) {
        throw new ForbiddenException(
          `Cashier seat limit reached (${shop.cashierLimit}). Upgrade your plan to add more cashiers.`,
        );
      }
    }

    // Create the platform user if they don't exist yet, else reuse
    let user = await this.userRepo.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });

    if (!user) {
      const passwordHash = await bcrypt.hash(dto.password, 12);
      user = this.userRepo.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
      });
      user = await this.userRepo.save(user);
    }

    // Check if already assigned to this shop
    const existing = await this.shopUserRepo.findOne({
      where: { shopId, userId: user.id },
    });
    if (existing) {
      throw new ConflictException('User is already assigned to this shop');
    }

    const shopUser = this.shopUserRepo.create({
      shopId,
      userId: user.id,
      roles: dto.roles,
      isActive: true,
    });
    return this.shopUserRepo.save(shopUser);
  }

  async createForOwner(userId: string, dto: CreateShopDto): Promise<Shop> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.shopLimit === 0 || user.shopLimit === null) {
      throw new ForbiddenException('You are not allowed to create shops.');
    }

    const ownedCount = await this.shopUserRepo
      .createQueryBuilder('su')
      .where('su.user_id = :userId', { userId })
      .andWhere(':role = ANY(su.roles)', { role: UserRole.SHOP_OWNER })
      .getCount();

    if (ownedCount >= user.shopLimit) {
      throw new ForbiddenException(
        `Shop limit reached (${user.shopLimit}). Contact support to increase your limit.`,
      );
    }

    const shop = await this.create(dto);

    const shopUser = this.shopUserRepo.create({
      shopId: shop.id,
      userId,
      roles: [UserRole.SHOP_OWNER],
      isActive: true,
    });
    await this.shopUserRepo.save(shopUser);

    return shop;
  }

  async findOwnedShops(userId: string): Promise<Shop[]> {
    const shopUsers = await this.shopUserRepo.find({
      where: { userId },
      relations: ['shop'],
    });
    return shopUsers
      .filter(su => su.roles.includes(UserRole.SHOP_OWNER) && su.shop)
      .map(su => su.shop);
  }

  async findOwnedShop(shopId: string, userId: string): Promise<Shop> {
    const shopUser = await this.shopUserRepo.findOne({ where: { shopId, userId } });
    if (!shopUser || !shopUser.roles.includes(UserRole.SHOP_OWNER)) {
      throw new ForbiddenException('You do not own this shop.');
    }
    return this.findById(shopId);
  }

  async updateOwnShop(shopId: string, userId: string, dto: UpdateOwnShopDto): Promise<Shop> {
    const shopUser = await this.shopUserRepo.findOne({ where: { shopId, userId } });
    if (!shopUser || !shopUser.roles.includes(UserRole.SHOP_OWNER)) {
      throw new ForbiddenException('You do not own this shop.');
    }
    const shop = await this.findById(shopId);
    Object.assign(shop, dto);
    return this.shopRepo.save(shop);
  }

  async setUserShopLimit(userId: string, shopLimit: number | null): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.shopLimit = shopLimit;
    return this.userRepo.save(user);
  }

  async listShopUsers(shopId: string): Promise<ShopUser[]> {
    await this.findById(shopId);
    const shopUsers = await this.shopUserRepo.find({
      where: { shopId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    return shopUsers.filter((su) => !su.roles.includes(UserRole.SHOP_OWNER));
  }

  async removeUserFromShop(shopId: string, userId: string): Promise<void> {
    const shopUser = await this.shopUserRepo.findOne({ where: { shopId, userId } });
    if (!shopUser) throw new NotFoundException('User is not assigned to this shop');
    await this.shopUserRepo.remove(shopUser);
  }

  // ── Scheduled subscription expiry ─────────────────────────────────────────

  /**
   * Runs daily at 01:00 UTC.
   * Marks ACTIVE/TRIAL shops as EXPIRED if their subscription date has passed.
   */
  @Cron('0 1 * * *')
  async expireSubscriptions(): Promise<void> {
    await this.shopRepo
      .createQueryBuilder()
      .update(Shop)
      .set({ subscriptionStatus: SubscriptionStatus.EXPIRED })
      .where('subscription_expires_at < NOW()')
      .andWhere('subscription_status IN (:...statuses)', {
        statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
      })
      .execute();
  }
}
