import { IsDateString, IsEmail, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShopDto {
  @ApiProperty({ example: 'Baraka Supermarket' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'ISO date string — when the subscription expires' })
  @IsOptional()
  @IsDateString()
  subscriptionExpiresAt?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of cashier seats. Leave null for unlimited.',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  cashierLimit?: number;
}
