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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationQueryDto } from '@common/utils/pagination.util';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { OrdersService } from '@modules/orders/orders.service';
import { UserRole } from '@modules/users/enums/user-role.enum';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: JwtPayload) {
    return this.customersService.create(dto, user.shopId!);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
    return this.customersService.findAll(user.shopId ?? null, query);
  }

  @Get('phone/:phone')
  findByPhone(@Param('phone') phone: string, @CurrentUser() user: JwtPayload) {
    return this.customersService.findByPhone(phone, user.shopId!);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.customersService.findById(id, user.shopId);
  }

  @Get(':id/orders')
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all orders for a customer in this shop' })
  getCustomerOrders(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ordersService.findByCustomer(id, user.shopId!, query);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.customersService.update(id, dto, user.shopId!);
  }
}
