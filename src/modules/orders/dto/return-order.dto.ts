import {
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Quantity returned. Up to 3 decimals for kg/meter products.',
    minimum: 0.001,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;
}

export class ReturnOrderDto {
  @ApiProperty({ type: [ReturnItemDto], description: 'Items and quantities to return' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
