import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { DiscountType } from '@modules/orders/enums/discount-type.enum';

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: DiscountType,
    description:
      'Default discount type applied automatically to this customer\'s orders ' +
      '(percent or fixed). Cashier can still override per-order.',
  })
  @IsOptional()
  @IsEnum(DiscountType)
  defaultDiscountType?: DiscountType;

  @ApiPropertyOptional({
    description:
      'Default discount value. Interpreted by defaultDiscountType: percent ' +
      '(e.g. 10 = 10%) or fixed sum.',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDiscountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
