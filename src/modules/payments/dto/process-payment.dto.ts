import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/payment.entity';

export class ProcessPaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ description: 'Cash tendered — required for cash payments' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountTendered?: number;

  @ApiPropertyOptional({ description: 'Card / mobile money transaction reference' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;
}
