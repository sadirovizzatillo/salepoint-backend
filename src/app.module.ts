import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { WinstonModule } from 'nest-winston';

import appConfig from '@config/app.config';
import databaseConfig from '@config/database.config';
import redisConfig from '@config/redis.config';
import jwtConfig from '@config/jwt.config';
import throttleConfig from '@config/throttle.config';
import printerConfig from '@config/printer.config';
import smsConfig from '@config/sms.config';

import { validationSchema } from '@config/validation.schema';
import { typeOrmFactory } from '@database/typeorm.factory';
import { redisFactory } from '@cache/redis.factory';
import { winstonConfig } from '@config/logger.config';

import { CacheModule } from '@cache/cache.module';
import { HealthModule } from './health/health.module';
import { PrinterModule } from '@modules/printer/printer.module';

import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { ShopsModule } from '@modules/shops/shops.module';
import { ProductsModule } from '@modules/products/products.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { ShiftsModule } from '@modules/shifts/shifts.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { DebtsModule } from '@modules/debts/debts.module';
import { SmsModule } from '@modules/sms/sms.module';

import { CashierModule } from '@modules/cashier/cashier.module';
import { DashboardModule } from '@modules/dashboard/dashboard.module';
import { ConsoleModule } from '@modules/console/console.module';

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, throttleConfig, printerConfig, smsConfig],
      validationSchema,
      validationOptions: { abortEarly: true },
    }),

    // ── Logging ───────────────────────────────────────────────
    WinstonModule.forRootAsync(winstonConfig),

    // ── Database ──────────────────────────────────────────────
    TypeOrmModule.forRootAsync(typeOrmFactory),

    // ── Redis / Cache ─────────────────────────────────────────
    CacheModule,

    // ── Throttle ──────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => [
        { ttl: cs.get<number>('throttle.ttl')! * 1000, limit: cs.get<number>('throttle.limit')! },
      ],
    }),

    // ── Events & Scheduling ───────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    ScheduleModule.forRoot(),

    // ── Bull Queues ───────────────────────────────────────────
    BullModule.forRootAsync(redisFactory.bull),

    // ── Feature Modules ───────────────────────────────────────
    HealthModule,
    AuthModule,
    UsersModule,
    ShopsModule,        // ← NEW: multi-tenancy foundation
    SessionsModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    CustomersModule,
    InventoryModule,
    ShiftsModule,
    ReportsModule,
    DebtsModule,
    SmsModule,

    // ── Printer ───────────────────────────────────────────────
    PrinterModule,

    // ── Client-Specific Gateway Modules ───────────────────────
    CashierModule,      // cashier.domain.com
    DashboardModule,    // dashboard.domain.com
    ConsoleModule,      // console.domain.com  ← NEW: super admin
  ],
})
export class AppModule {}
