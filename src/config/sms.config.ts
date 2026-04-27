import { registerAs } from '@nestjs/config';

export default registerAs('sms', () => ({
  token:       process.env.DEVSMS_TOKEN ?? '',
  from:        process.env.DEVSMS_FROM ?? '4546',
  baseUrl:     process.env.DEVSMS_BASE_URL ?? 'https://devsms.uz/api',
  callbackUrl: process.env.DEVSMS_CALLBACK_URL ?? 'https://teztarqat.uz/sms/callback',
}));

