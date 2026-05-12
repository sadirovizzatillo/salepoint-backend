import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({
    description:
      'Absolute quantity on hand after adjustment. Up to 3 decimals for kg/meter products.',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
