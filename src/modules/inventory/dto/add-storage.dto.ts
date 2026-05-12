import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddStorageDto {
  @ApiProperty({ description: 'Product to receive into storage' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description:
      'Mahsulot miqdori — units received. Up to 3 decimals for kg/meter products.',
    minimum: 0.001,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Mahsulot tan narxi — cost price per unit', minimum: 0 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ description: 'Mahsulot foizi — markup percentage (e.g. 30 = 30%)', minimum: 0 })
  @IsNumber()
  @Min(0)
  margin: number;

  @ApiPropertyOptional({
    description:
      'Sotish narxi — selling price per unit. If omitted, auto-calculated: costPrice × (1 + margin / 100)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @ApiPropertyOptional({
    description:
      'When true (default), updates the product catalogue price to match this sellingPrice. ' +
      'Pass false to keep the existing product price.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  syncProductPrice?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
