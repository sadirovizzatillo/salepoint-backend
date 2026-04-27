import { IsArray, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@modules/users/enums/user-role.enum';

const STAFF_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

export class CreateStaffDto {
  @ApiProperty({ description: 'Full name of the staff member' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'cashier@myshop.com' })
  @IsString()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    enum: STAFF_ROLES,
    isArray: true,
    example: [UserRole.CASHIER],
    description: 'Allowed values: admin, manager, cashier. Shop owners cannot assign shop_owner or super_admin.',
  })
  @IsArray()
  @IsEnum(STAFF_ROLES, { each: true })
  roles: StaffRole[];
}
