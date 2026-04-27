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
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '@common/guards/subscription.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { UserRole } from '@modules/users/enums/user-role.enum';

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  @ApiOperation({ summary: 'Open a new cashier shift' })
  open(@Body() dto: OpenShiftDto, @CurrentUser() user: JwtPayload) {
    return this.shiftsService.openShift(dto, user.sub, user.shopId!);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a cashier shift' })
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shiftsService.closeShift(id, dto, user.sub, user.shopId!);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all shifts for the shop (owner/manager)' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.shiftsService.findAll(user.shopId ?? null);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the current open shift for this cashier' })
  getActive(@CurrentUser() user: JwtPayload) {
    return this.shiftsService.getActiveShift(user.sub, user.shopId!);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get recent shifts for the authenticated cashier' })
  getMine(@CurrentUser() user: JwtPayload) {
    return this.shiftsService.findByCashier(user.sub, user.shopId!);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shiftsService.findById(id, user.shopId);
  }
}
