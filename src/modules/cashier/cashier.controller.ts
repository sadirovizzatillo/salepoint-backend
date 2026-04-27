import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { ClientTypeGuard } from '@common/guards/client-type.guard';
import { ForClient } from '@common/decorators/client-type.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { ProductsService } from '@modules/products/products.service';
import { OrdersService } from '@modules/orders/orders.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { CustomersService } from '@modules/customers/customers.service';
import { ShiftsService } from '@modules/shifts/shifts.service';
import { CreateOrderDto } from '@modules/orders/dto/create-order.dto';
import { ProcessPaymentDto } from '@modules/payments/dto/process-payment.dto';
import { OpenShiftDto } from '@modules/shifts/dto/open-shift.dto';

@ApiTags('cashier')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard, ClientTypeGuard)
@ForClient('cashier')
@Controller('cashier')
export class CashierController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly customersService: CustomersService,
    private readonly shiftsService: ShiftsService,
  ) {}

  // ── Shift ──────────────────────────────────────────────────────────────────

  @Post('shift/open')
  @ApiOperation({ summary: 'Open cashier shift' })
  openShift(@Body() dto: OpenShiftDto, @CurrentUser() user: JwtPayload) {
    return this.shiftsService.openShift(dto, user.sub, user.shopId!);
  }

  @Get('shift/active')
  @ApiOperation({ summary: 'Get the active shift for this cashier' })
  getActiveShift(@CurrentUser() user: JwtPayload) {
    return this.shiftsService.getActiveShift(user.sub, user.shopId!);
  }

  // ── Product lookup ─────────────────────────────────────────────────────────

  @Get('products/search')
  @ApiOperation({ summary: 'Search products by name, SKU or barcode' })
  searchProducts(@Query('q') q: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findAll(user.shopId!, {
      search: q,
      page: 1,
      limit: 20,
      skip: 0,
      active: true,
    } as any);
  }

  @Get('products/barcode/:barcode')
  @ApiOperation({ summary: 'Scan barcode to get product' })
  getByBarcode(@Param('barcode') barcode: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findByBarcode(barcode, user.shopId!);
  }

  // ── Quick-sale flow ────────────────────────────────────────────────────────

  @Post('sale/order')
  @ApiOperation({ summary: 'Create an order — step 1 of quick-sale flow' })
  createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.ordersService.create(dto, user.sub, user.shopId!);
  }

  @Post('sale/pay')
  @ApiOperation({ summary: 'Process payment — step 2 of quick-sale flow' })
  pay(@Body() dto: ProcessPaymentDto, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.process(dto, user.shopId!);
  }

  // ── Customer lookup ────────────────────────────────────────────────────────

  @Get('customers/phone/:phone')
  @ApiOperation({ summary: 'Look up a customer by phone number' })
  lookupCustomer(@Param('phone') phone: string, @CurrentUser() user: JwtPayload) {
    return this.customersService.findByPhone(phone, user.shopId!);
  }
}
