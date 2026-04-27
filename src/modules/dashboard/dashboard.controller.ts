import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { ClientTypeGuard } from '@common/guards/client-type.guard';
import { ForClient } from '@common/decorators/client-type.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { ReportsService } from '@modules/reports/reports.service';
import { InventoryService } from '@modules/inventory/inventory.service';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

class DateRangeQuery {
  @Type(() => Date) @IsDate() from: Date;
  @Type(() => Date) @IsDate() to: Date;
}

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard, ClientTypeGuard)
@ForClient('dashboard')
@Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SHOP_OWNER)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard KPI overview for today' })
  async getOverview(@CurrentUser() user: JwtPayload) {
    const TZ_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5 Tashkent
    const localNow     = new Date(Date.now() + TZ_OFFSET_MS);
    const y = localNow.getUTCFullYear(), m = localNow.getUTCMonth(), d = localNow.getUTCDate();
    const startOfDay   = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - TZ_OFFSET_MS);
    const endOfDay     = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - TZ_OFFSET_MS);
    const shopId       = user.shopId!;

    const [summary, topProducts, paymentMethods, lowStock] = await Promise.all([
      this.reportsService.getSalesSummary(shopId, startOfDay, endOfDay),
      this.reportsService.getTopProducts(shopId, startOfDay, endOfDay, 5),
      this.reportsService.getPaymentMethodBreakdown(shopId, startOfDay, endOfDay),
      this.inventoryService.getLowStockProducts(shopId),
    ]);

    return { summary, topProducts, paymentMethods, lowStockAlerts: lowStock.length };
  }

  @Get('sales-trend')
  @ApiOperation({ summary: 'Daily sales trend for a date range' })
  getSalesTrend(@CurrentUser() user: JwtPayload, @Query() q: DateRangeQuery) {
    return this.reportsService.getSalesByDay(user.shopId!, q.from, q.to);
  }

  @Get('cashier-performance')
  @ApiOperation({ summary: 'Per-cashier sales performance' })
  getCashierPerformance(@CurrentUser() user: JwtPayload, @Query() q: DateRangeQuery) {
    return this.reportsService.getSalesByCashier(user.shopId!, q.from, q.to);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Products at or below reorder point' })
  getLowStock(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getLowStockProducts(user.shopId!);
  }
}
