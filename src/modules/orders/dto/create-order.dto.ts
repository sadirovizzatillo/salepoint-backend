import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../entities/order.entity';

export class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({
    description:
      'Quantity sold. Integer for piece-products, up to 3 decimals for kg/meter.',
    minimum: 0.001,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional({ default: 0, description: 'Amount paid by cash' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidByCash?: number;

  @ApiPropertyOptional({ default: 0, description: 'Amount paid by card' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidByCard?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shiftId?: string;
}
