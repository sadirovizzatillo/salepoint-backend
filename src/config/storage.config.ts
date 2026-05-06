import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint:      process.env.DO_SPACES_ENDPOINT!,
  region:        process.env.DO_SPACES_REGION!,
  bucket:        process.env.DO_SPACES_BUCKET!,
  accessKey:     process.env.DO_SPACES_KEY!,
  secretKey:     process.env.DO_SPACES_SECRET!,
  cdnEndpoint:   process.env.DO_SPACES_CDN_ENDPOINT!,
  uploadUrlTtl:  Number(process.env.DO_UPLOAD_URL_TTL ?? 300),
  maxImageBytes: Number(process.env.MAX_IMAGE_BYTES ?? 5_242_880),
}));
