import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop, SubscriptionStatus } from '@modules/shops/entities/shop.entity';
import { UserRole } from '@modules/users/enums/user-role.enum';

/**
 * Applied after JwtAuthGuard on all shop-scoped routes.
 * SUPER_ADMIN (shopId = null) bypasses this guard entirely.
 * All other roles must have an active or trial subscription.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    // SUPER_ADMIN operates outside any shop context
    if (user?.roles?.includes(UserRole.SUPER_ADMIN)) return true;

    const shopId: string | undefined = user?.shopId;
    if (!shopId) {
      throw new ForbiddenException('No shop context in token. Call /auth/select-shop first.');
    }

    const shop = await this.shopRepo.findOne({
      where: { id: shopId },
      select: ['id', 'subscriptionStatus'],
    });

    if (!shop) throw new ForbiddenException('Shop not found');

    if (shop.subscriptionStatus === SubscriptionStatus.SUSPENDED) {
      throw new ForbiddenException('This shop has been suspended. Contact support.');
    }

    if (shop.subscriptionStatus === SubscriptionStatus.EXPIRED) {
      throw new HttpException(
        'Shop subscription has expired. Please renew to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
