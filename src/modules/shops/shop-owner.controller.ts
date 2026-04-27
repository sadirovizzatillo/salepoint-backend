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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateOwnShopDto } from './dto/update-own-shop.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';

@ApiTags('shop')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOP_OWNER)
@Controller('shop')
export class ShopOwnerController {
  constructor(private readonly shopsService: ShopsService) {}

  // ── Self-service shop creation ─────────────────────────────────────────────

  @Post('shops')
  @ApiOperation({
    summary: 'Create a new shop (self-service)',
    description: 'Creates a new shop and assigns you as SHOP_OWNER. Allowed only up to your shopLimit.',
  })
  createShop(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateShopDto,
  ) {
    return this.shopsService.createForOwner(user.sub, dto);
  }

  @Get('shops')
  @ApiOperation({ summary: 'List all shops you own' })
  listOwnedShops(@CurrentUser() user: JwtPayload) {
    return this.shopsService.findOwnedShops(user.sub);
  }

  @Get('shops/:shopId')
  @ApiOperation({ summary: 'Get details of one of your shops' })
  getOwnedShop(
    @CurrentUser() user: JwtPayload,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ) {
    return this.shopsService.findOwnedShop(shopId, user.sub);
  }

  @Patch('shops/:shopId')
  @ApiOperation({ summary: 'Update your shop info (name, address, phone, email, logo)' })
  updateOwnShop(
    @CurrentUser() user: JwtPayload,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: UpdateOwnShopDto,
  ) {
    return this.shopsService.updateOwnShop(shopId, user.sub, dto);
  }

  // ── Staff management ───────────────────────────────────────────────────────

  @Post('staff')
  @UseGuards(SubscriptionGuard)
  @ApiOperation({
    summary: 'Add a staff member to your shop',
    description: 'Creates a new user (or reuses an existing one) and assigns them to your shop. Allowed roles: admin, manager, cashier.',
  })
  addStaff(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStaffDto,
  ) {
    return this.shopsService.assignUser(user.shopId!, dto);
  }

  @Get('staff')
  @UseGuards(SubscriptionGuard)
  @ApiOperation({ summary: 'List all staff in your shop' })
  listStaff(@CurrentUser() user: JwtPayload) {
    return this.shopsService.listShopUsers(user.shopId!);
  }

  @Delete('staff/:userId')
  @UseGuards(SubscriptionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a staff member from your shop' })
  removeStaff(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.shopsService.removeUserFromShop(user.shopId!, userId);
  }
}
