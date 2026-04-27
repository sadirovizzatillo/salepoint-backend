import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AddStorageDto } from './dto/add-storage.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/utils/pagination.util';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('storage')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Receive products into storage (creates a new stock batch)' })
  addToStorage(@Body() dto: AddStorageDto, @CurrentUser() user: JwtPayload) {
    return this.inventoryService.addToStorage(dto, user.sub, user.shopId!);
  }

  @Get('storage/:productId')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'List storage batches for a product (FIFO order)' })
  getStorageBatches(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.inventoryService.getStorageBatches(productId, user.shopId!, query);
  }

  @Get('warehouse')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'All products in warehouse with stock levels' })
  getWarehouse(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
    return this.inventoryService.getWarehouse(user.shopId!, query);
  }

  @Get('low-stock')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Products at or below reorder point' })
  getLowStock(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getLowStockProducts(user.shopId!);
  }

  @Get(':productId/level')
  @ApiOperation({ summary: 'Current stock level for a product' })
  getLevel(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.inventoryService.getStockLevel(productId, user.shopId!);
  }

  @Get(':productId/movements')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Stock movement history for a product' })
  getMovements(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.inventoryService.findMovements(productId, user.shopId!, query);
  }

  @Post('adjust')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Manual stock adjustment' })
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: JwtPayload) {
    return this.inventoryService.adjust(dto, user.sub, user.shopId!);
  }
}
