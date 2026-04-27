import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  name: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA ?? 'public',
  ssl: process.env.DB_SSL === 'true',
  poolMin: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
  poolMax: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
  sync: process.env.DB_SYNC === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));
