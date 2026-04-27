import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '@common/utils/pagination.util';
import { DebtStatus } from '../entities/debt.entity';

export class DebtQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: DebtStatus })
  @IsOptional()
  @IsEnum(DebtStatus)
  status?: DebtStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cashierId?: string;

  @ApiPropertyOptional({ description: 'Filter debts by the shift they were created in' })
  @IsOptional()
  @IsUUID()
  shiftId?: string;
}

export class RepayDebtDto {
  @ApiProperty({ description: 'Amount to repay', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
