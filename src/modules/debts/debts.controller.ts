import {
  Body,
  Controller,
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { DebtsService } from './debts.service';
import { DebtQueryDto, RepayDebtDto } from './dto/repay-debt.dto';
import { PaginationQueryDto } from '@common/utils/pagination.util';
import { SmsService } from '@modules/sms/sms.service';

@ApiTags('debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Controller('debts')
export class DebtsController {
  constructor(
    private readonly debtsService: DebtsService,
    private readonly smsService: SmsService,
  ) {}

  @Get()
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List debts. Cashiers automatically see only their own.' })
  findAll(@Query() query: DebtQueryDto, @CurrentUser() user: JwtPayload) {
    // Cashier-only users are restricted to their own created debts
    if (
      user.roles.includes(UserRole.CASHIER) &&
      !user.roles.some((r) => [UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER].includes(r))
    ) {
      query.cashierId = user.sub;
    }
    return this.debtsService.findAll(user.shopId ?? null, query);
  }

  @Get('summary')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Debtors list grouped by customer with total remaining debt' })
  getDebtorsSummary(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtPayload) {
    return this.debtsService.getDebtorsSummary(user.shopId!, query);
  }

  @Get(':id')
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.debtsService.findById(id, user.shopId);
  }

  @Patch(':id/repay')
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  repay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RepayDebtDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.debtsService.repay(id, dto, user.sub, user.shopId!);
  }

  @Post('customers/:customerId/sms-reminder')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
  @ApiOperation({ summary: 'Send SMS reminder to a customer for all their outstanding debts' })
  sendSmsReminder(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.smsService.sendDebtReminder(customerId, user.shopId!);
  }
}
