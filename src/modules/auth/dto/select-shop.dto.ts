import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectShopDto {
  @ApiProperty({ description: 'ID of the shop to activate in the session' })
  @IsUUID()
  shopId: string;
}
