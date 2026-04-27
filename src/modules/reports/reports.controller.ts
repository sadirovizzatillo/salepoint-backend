import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { ForClient } from '@common/decorators/client-type.decorator';
import { ClientTypeGuard } from '@common/guards/client-type.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

class DateRangeQuery {
  @Type(() => Date) @IsDate() from: Date;
  @Type(() => Date) @IsDate() to: Date;
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard, ClientTypeGuard)
@ForClient('dashboard')
@Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Sales summary for a date range' })
  getSummary(@CurrentUser() user: JwtPayload, @Query() q: DateRangeQuery) {
    return this.reportsService.getSalesSummary(user.shopId!, q.from, q.to);
  }

  @Get('sales-by-day')
  @ApiOperation({ summary: 'Daily sales breakdown' })
  getSalesByDay(@CurrentUser() user: JwtPayload, @Query() q: DateRangeQuery) {
    return this.reportsService.getSalesByDay(user.shopId!, q.from, q.to);
  }

  @Get('sales-by-hour')
  @ApiOperation({ summary: 'Hourly sales breakdown for a given day' })
  @ApiQuery({ name: 'date', type: String, example: '2025-01-15' })
  getSalesByHour(@CurrentUser() user: JwtPayload, @Query('date') date: string) {
    return this.reportsService.getSalesByHour(user.shopId!, new Date(date));
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top selling products by quantity' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopProducts(
    @CurrentUser() user: JwtPayload,
    @Query() q: DateRangeQuery,
    @Query('limit') limit = 10,
  ) {
    return this.reportsService.getTopProducts(user.shopId!, q.from, q.to, limit);
  }

  @Get('by-cashier')
  @ApiOperation({ summary: 'Sales breakdown per cashier' })
  getByCashier(@CurrentUser() user: JwtPayload, @Query() q: DateRangeQuery) {
    return this.reportsService.getSalesByCashier(user.shopId!, q.from, q.to);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Revenue breakdown by payment method' })
  getPaymentMethods(@CurrentUser() user: JwtPayload, @Query() q: DateRangeQuery) {
    return this.reportsService.getPaymentMethodBreakdown(user.shopId!, q.from, q.to);
  }
}
