import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '@modules/users/users.module';
import { ShiftsModule } from '@modules/shifts/shifts.module';
import { RefreshToken } from './entities/refresh-token.entity';
import { ShopUser } from '@modules/shops/entities/shop-user.entity';
import { Shop } from '@modules/shops/entities/shop.entity';

@Module({
  imports: [
    UsersModule,
    ShiftsModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshToken, ShopUser, Shop]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get('jwt.accessSecret'),
        signOptions: { expiresIn: cs.get('jwt.accessExpiresIn') },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
