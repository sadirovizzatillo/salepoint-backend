import { IsArray, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@modules/users/enums/user-role.enum';

export class AssignUserToShopDto {
  @ApiProperty({ description: 'Name of the new user' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'owner@baraka.com' })
  @IsString()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: UserRole, isArray: true, example: [UserRole.SHOP_OWNER] })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
