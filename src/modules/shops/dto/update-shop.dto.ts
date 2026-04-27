import { PartialType } from '@nestjs/swagger';
import { CreateShopDto } from './create-shop.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { SubscriptionStatus } from '../entities/shop.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateShopDto extends PartialType(CreateShopDto) {
  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;
}
