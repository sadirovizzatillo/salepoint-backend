import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SelectShopDto } from './dto/select-shop.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserRole } from '@modules/users/enums/user-role.enum';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 1 — validate credentials',
    description:
      'SUPER_ADMIN receives a full token pair. ' +
      'All other users receive a preAuthToken + list of shops. ' +
      'Pass the preAuthToken to POST /auth/select-shop to complete login.',
  })
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, req.ip);
  }

  @Public()
  @Post('select-shop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Step 2 — activate a shop and receive full token pair',
    description: 'Send the preAuthToken in Authorization: Bearer header.',
  })
  selectShop(
    @Body() dto: SelectShopDto,
    @Headers('authorization') authHeader: string,
    @Req() req: any,
  ) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('preAuthToken required in Authorization header');
    }
    const preAuthToken = authHeader.slice(7);
    return this.authService.selectShop(dto, preAuthToken, req.ip);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @Post('switch-shop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Switch to a different shop — returns a new token pair scoped to the new shop',
    description: 'Requires a valid access token. Current session is revoked. Not available for cashiers.',
  })
  switchShop(
    @Body() dto: SelectShopDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: any,
  ) {
    return this.authService.switchShop(user, dto, req.ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange refresh token for a new token pair' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    return this.authService.refresh(dto.refreshToken, req.ip);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke current session' })
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub, user.sessionId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all sessions for this user across all shops' })
  logoutAll(@CurrentUser('sub') userId: string) {
    return this.authService.logoutAll(userId);
  }
}
