import { registerAs } from '@nestjs/config';

export default registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
}));
