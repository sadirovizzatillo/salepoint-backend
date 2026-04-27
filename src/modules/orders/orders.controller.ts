import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ReturnOrderDto } from './dto/return-order.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { PaginationQueryDto } from '@common/utils/pagination.util';
import { OrderStatus } from './entities/order.entity';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Create order — add ?isPrintCheck=true to also print receipt' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: JwtPayload,
    @Query('isPrintCheck') isPrintCheck?: string,
  ) {
    return this.ordersService.create(dto, user.sub, user.shopId!, isPrintCheck === 'true');
  }

  @Get()
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN, UserRole.CASHIER)
  @ApiOperation({ summary: 'List orders' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
    @Query('status') status?: OrderStatus,
    @Query('cashierId') cashierId?: string,
    @Query('from') from?: Date,
    @Query('to') to?: Date,
  ) {
    return this.ordersService.findAll(
      user.shopId ?? null,
      Object.assign(query, { status, cashierId, from, to }),
    );
  }

  @Get(':id')
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.findById(id, user.shopId);
  }

  @Get(':id/receipt')
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Get receipt data (JSON)' })
  getReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.getReceipt(id, user.shopId!);
  }

  @Post(':id/print')
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Send receipt to thermal printer' })
  async printOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.ordersService.printOrder(id, user.shopId!);
    return { printed: true };
  }

  @Patch(':id/cancel')
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.cancel(id, user.shopId!);
  }

  @Patch(':id/mark-paid')
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN)
  markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.markPaid(id, user.shopId!);
  }

  @Post(':id/return')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Return items — restores stock and marks order REFUNDED' })
  returnOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.returnOrder(id, dto, user.sub, user.shopId!);
  }
}
