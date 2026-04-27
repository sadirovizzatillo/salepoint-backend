import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty({ description: 'Cash float at shift open', minimum: 0 })
  @IsNumber()
  @Min(0)
  openingFloat: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
