import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopsService } from './shops.service';
import { ShopOwnerController } from './shop-owner.controller';
import { Shop } from './entities/shop.entity';
import { ShopUser } from './entities/shop-user.entity';
import { User } from '@modules/users/entities/user.entity';
import { SubscriptionGuard } from '@common/guards/subscription.guard';

/**
 * @Global() — makes ShopsService and SubscriptionGuard available everywhere
 * without explicit imports. Appropriate because both are cross-cutting concerns
 * used by virtually every feature module.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Shop, ShopUser, User])],
  controllers: [ShopOwnerController],
  providers: [ShopsService, SubscriptionGuard],
  exports: [ShopsService, SubscriptionGuard, TypeOrmModule],
})
export class ShopsModule {}
