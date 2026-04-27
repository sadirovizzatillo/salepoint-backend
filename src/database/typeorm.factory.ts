import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export const typeOrmFactory: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cs: ConfigService): DataSourceOptions => ({
    type: 'postgres',
    host: cs.get('database.host'),
    port: cs.get<number>('database.port'),
    username: cs.get('database.username'),
    password: cs.get('database.password'),
    database: cs.get('database.name'),
    schema: cs.get('database.schema'),
    ssl: cs.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
    synchronize: cs.get<boolean>('database.sync'),
    logging: cs.get<boolean>('database.logging'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    migrationsRun: true,
    poolSize: cs.get<number>('database.poolMax'),
    extra: {
      min: cs.get<number>('database.poolMin'),
      max: cs.get<number>('database.poolMax'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  }),
};
