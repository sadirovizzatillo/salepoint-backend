import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Matches, Max, Min } from 'class-validator';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export class RequestImageUploadDto {
  @ApiProperty({ enum: ALLOWED_IMAGE_MIME_TYPES })
  @IsIn(ALLOWED_IMAGE_MIME_TYPES as unknown as string[])
  contentType: AllowedImageMime;

  @ApiProperty({ description: 'File size in bytes', example: 245678 })
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  size: number;
}

export class ConfirmImageDto {
  @ApiProperty({
    description: 'Storage key returned from /image/upload-url',
    example: 'shops/<shopId>/products/<productId>/<uuid>.jpg',
  })
  @IsString()
  @Matches(
    /^shops\/[0-9a-f-]+\/products\/[0-9a-f-]+\/[0-9a-f-]+\.(jpg|jpeg|png|webp)$/i,
  )
  key: string;
}
