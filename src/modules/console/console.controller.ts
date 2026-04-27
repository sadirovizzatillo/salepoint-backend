import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

import { ShopsService } from '@modules/shops/shops.service';
import { CreateShopDto } from '@modules/shops/dto/create-shop.dto';
import { UpdateShopDto } from '@modules/shops/dto/update-shop.dto';
import { AssignUserToShopDto } from '@modules/shops/dto/assign-user.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { ClientTypeGuard } from '@common/guards/client-type.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ForClient } from '@common/decorators/client-type.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { PaginationQueryDto } from '@common/utils/pagination.util';

class SetShopLimitDto {
  @ApiPropertyOptional({
    description: '0 = disabled, positive integer = max shops, null = unlimited',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  shopLimit: number | null;
}

@ApiTags('console')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ClientTypeGuard)
@Roles(UserRole.SUPER_ADMIN)
@ForClient('console')
@Controller('console')
export class ConsoleController {
  constructor(private readonly shopsService: ShopsService) {}

  // ── Shops ──────────────────────────────────────────────────────────────────

  @Post('shops')
  @ApiOperation({ summary: 'Create a new shop' })
  createShop(@Body() dto: CreateShopDto) {
    return this.shopsService.create(dto);
  }

  @Get('shops')
  @ApiOperation({ summary: 'List all shops with subscription status' })
  listShops(@Query() query: PaginationQueryDto) {
    return this.shopsService.findAll(query);
  }

  @Get('shops/:id')
  @ApiOperation({ summary: 'Get shop details' })
  getShop(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.findById(id);
  }

  @Patch('shops/:id')
  @ApiOperation({ summary: 'Update shop details or subscription' })
  updateShop(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.update(id, dto);
  }

  @Patch('shops/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a shop (blocks all logins)' })
  suspendShop(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.suspend(id);
  }

  @Patch('shops/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended or expired shop' })
  activateShop(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.activate(id);
  }

  @Delete('shops/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a shop' })
  deleteShop(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.softDelete(id);
  }

  // ── Shop user management ───────────────────────────────────────────────────

  @Post('shops/:id/users')
  @ApiOperation({ summary: 'Create a user and assign them to a shop (onboarding)' })
  assignUser(
    @Param('id', ParseUUIDPipe) shopId: string,
    @Body() dto: AssignUserToShopDto,
  ) {
    return this.shopsService.assignUser(shopId, dto);
  }

  @Get('shops/:id/users')
  @ApiOperation({ summary: 'List all users assigned to a shop' })
  listShopUsers(@Param('id', ParseUUIDPipe) shopId: string) {
    return this.shopsService.listShopUsers(shopId);
  }

  @Delete('shops/:id/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a user from a shop' })
  removeUser(
    @Param('id', ParseUUIDPipe) shopId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.shopsService.removeUserFromShop(shopId, userId);
  }

  // ── User management ────────────────────────────────────────────────────────

  @Patch('users/:id/shop-limit')
  @ApiOperation({
    summary: 'Set shop creation limit for a user',
    description: '0 = cannot create shops. Positive integer = max shops they can self-create. null = unlimited.',
  })
  setUserShopLimit(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: SetShopLimitDto,
  ) {
    return this.shopsService.setUserShopLimit(userId, dto.shopLimit);
  }
}
