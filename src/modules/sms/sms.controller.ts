import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { SmsService } from './sms.service';
import { SmsCallbackDto } from './dto/sms-callback.dto';
import { SmsLogQueryDto } from './dto/sms-log-query.dto';

@ApiTags('sms')
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delivery status webhook from devsms.uz — public endpoint' })
  handleCallback(@Body() dto: SmsCallbackDto) {
    return this.smsService.handleCallback(dto);
  }

  @Get('balance')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get SMS provider balance' })
  getBalance() {
    return this.smsService.getBalance();
  }

  @Get('logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary:
      'List SMS sent within the caller\'s shop. Defaults to the caller\'s own SMS; pass ?userId=all (SHOP_OWNER/ADMIN only) for the whole shop, or ?userId=<uuid> for a specific user. Response includes paginated rows and a status breakdown for totals.',
  })
  listLogs(@Query() query: SmsLogQueryDto, @CurrentUser() user: JwtPayload) {
    if (!user.shopId) {
      throw new BadRequestException('Shop scope is required');
    }

    const canSeeWholeShop =
      user.roles.includes(UserRole.SHOP_OWNER) || user.roles.includes(UserRole.ADMIN);

    if (query.userId === 'all' as unknown as string) {
      if (!canSeeWholeShop) throw new BadRequestException('Not allowed to view shop-wide SMS');
      query.userId = undefined;
    } else if (query.userId) {
      if (!canSeeWholeShop && query.userId !== user.sub) {
        throw new BadRequestException('Not allowed to view SMS sent by other users');
      }
    } else {
      query.userId = user.sub;
    }

    return this.smsService.findLogs(user.shopId, query);
  }
}
