import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB ?? '0', 10),
  ttl: parseInt(process.env.REDIS_TTL_SECONDS ?? '300', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'pos:',
  bull: {
    host: process.env.BULL_REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.BULL_REDIS_PORT ?? '6379', 10),
    db: parseInt(process.env.BULL_REDIS_DB ?? '1', 10),
  },
}));
