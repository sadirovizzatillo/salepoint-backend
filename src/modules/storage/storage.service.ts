import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  NotFound,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import storageConfig from '@config/storage.config';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;

  constructor(
    @Inject(storageConfig.KEY)
    private readonly cfg: ConfigType<typeof storageConfig>,
  ) {
    this.s3 = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKey,
        secretAccessKey: cfg.secretKey,
      },
      forcePathStyle: false,
      // DO Spaces doesn't support the new SDK's auto-checksum middleware —
      // leaving these on adds x-amz-checksum-* headers that fail CORS preflight.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async createPresignedPut(params: {
    key: string;
    contentType: string;
  }): Promise<{ uploadUrl: string; expiresIn: number }> {
    // Don't pass ContentLength: presigner would bake a placeholder into the
    // canonical request, causing SignatureDoesNotMatch when the browser sends
    // the real byte count. Size is enforced upstream via the request DTO and
    // the frontend's pre-check; we can also re-verify with HEAD on confirm.
    const command = new PutObjectCommand({
      Bucket: this.cfg.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ACL: 'public-read',
    });
    const expiresIn = this.cfg.uploadUrlTtl;
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });
    return { uploadUrl, expiresIn };
  }

  async headObject(key: string): Promise<void> {
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      );
    } catch (err) {
      if (err instanceof NotFound || (err as { name?: string }).name === 'NotFound') {
        throw new NotFoundException('Uploaded file not found in storage');
      }
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
    );
  }

  publicUrl(key: string): string {
    return `${this.cfg.cdnEndpoint}/${key}`;
  }

  buildProductKey(shopId: string, productId: string, ext: string): string {
    return `shops/${shopId}/products/${productId}/${randomUUID()}.${ext}`;
  }
}
