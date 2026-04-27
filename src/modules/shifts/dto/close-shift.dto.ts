import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseShiftDto {
  @ApiProperty({ description: 'Counted cash float at shift close', minimum: 0 })
  @IsNumber()
  @Min(0)
  closingFloat: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
