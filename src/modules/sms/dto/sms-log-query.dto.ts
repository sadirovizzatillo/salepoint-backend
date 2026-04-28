import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationQueryDto } from '@common/utils/pagination.util';
import { SmsStatus } from '../entities/sms-log.entity';

export class SmsLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user who sent the SMS (defaults to caller)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: SmsStatus })
  @IsOptional()
  @IsEnum(SmsStatus)
  status?: SmsStatus;

  @ApiPropertyOptional({ description: 'ISO date — include SMS created at/after this time' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date — include SMS created at/before this time' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
