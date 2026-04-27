import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Process payment for an order' })
  process(@Body() dto: ProcessPaymentDto, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.process(dto, user.shopId!);
  }

  @Post(':id/refund')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Refund a completed payment' })
  refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refund(id, dto.reason);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get all payments for an order' })
  findByOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }
}
