import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { redisStore } from 'cache-manager-ioredis-yet';

export const redisFactory = {
  bull: {
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (cs: ConfigService) => ({
      redis: {
        host: cs.get('redis.bull.host'),
        port: cs.get<number>('redis.bull.port'),
        db: cs.get<number>('redis.bull.db'),
      },
    }),
  },
};

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (cs: ConfigService) => ({
        store: await redisStore({
          host: cs.get('redis.host'),
          port: cs.get<number>('redis.port'),
          password: cs.get('redis.password'),
          db: cs.get<number>('redis.db'),
          keyPrefix: cs.get('redis.keyPrefix'),
        }),
        ttl: cs.get<number>('redis.ttl')! * 1000,
      }),
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        return new Redis({
          host: cs.get('redis.host'),
          port: cs.get<number>('redis.port'),
          password: cs.get('redis.password'),
          db: cs.get<number>('redis.db'),
          keyPrefix: cs.get('redis.keyPrefix'),
          lazyConnect: false,
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT', NestCacheModule],
})
export class CacheModule {}
