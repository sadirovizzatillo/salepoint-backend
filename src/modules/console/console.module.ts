import { Module } from '@nestjs/common';
import { ConsoleController } from './console.controller';
import { ShopsModule } from '@modules/shops/shops.module';

/**
 * ConsoleModule groups routes exclusively for console.domain.com.
 * All routes are locked behind SUPER_ADMIN role + ClientTypeGuard('console').
 */
@Module({
  imports: [ShopsModule],
  controllers: [ConsoleController],
})
export class ConsoleModule {}
