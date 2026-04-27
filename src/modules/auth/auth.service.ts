import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

import { UsersService } from '@modules/users/users.service';
import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/users/enums/user-role.enum';
import { ShiftsService } from '@modules/shifts/shifts.service';
import { ShopUser } from '@modules/shops/entities/shop-user.entity';
import { Shop, SubscriptionStatus } from '@modules/shops/entities/shop.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { TokensDto, PreAuthResponseDto, ShopSummaryDto } from './dto/tokens.dto';
import { SelectShopDto } from './dto/select-shop.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly shiftsService: ShiftsService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(ShopUser)
    private readonly shopUserRepo: Repository<ShopUser>,
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
  ) {}

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  /**
   * Step 1 of login.
   *
   * SUPER_ADMIN → returns full TokensDto immediately (no shop selection needed).
   * Everyone else → returns PreAuthResponseDto with a 5-min pre_auth token
   *                 plus the list of shops they have access to.
   */
  async login(dto: LoginDto, clientIp: string): Promise<TokensDto | PreAuthResponseDto> {
    const user = await this.validateCredentials(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // SUPER_ADMIN skips shop selection and gets a full token immediately
    if (user.roles.includes(UserRole.SUPER_ADMIN)) {
      const tokens = await this.issueTokens(user, clientIp, null);
      await this.usersService.updateLastLogin(user.id);
      return tokens;
    }

    // Fetch the shops this user belongs to
    const shopUsers = await this.shopUserRepo.find({
      where: { userId: user.id, isActive: true },
      relations: ['shop'],
    });

    if (!shopUsers.length) {
      throw new ForbiddenException('Your account is not assigned to any shop yet.');
    }

    // Cashier-only accounts with a single shop skip pre-auth — log in directly
    const isCashierOnly = shopUsers.every((su) =>
      su.roles.every((r) => r === UserRole.CASHIER),
    );
    if (isCashierOnly && shopUsers.length === 1) {
      const shopUser = shopUsers[0];
      this.assertSubscriptionActive(shopUser.shop);
      await this.logoutAll(user.id);
      const [tokens] = await Promise.all([
        this.issueTokens(user, clientIp, shopUser.shopId, shopUser.roles),
        this.usersService.updateLastLogin(user.id),
      ]);
      const activeShift = await this.shiftsService.getActiveShift(user.id, shopUser.shopId);
      if (activeShift) tokens.message = 'Faol smena tiklandi';
      return tokens;
    }

    const shops: ShopSummaryDto[] = shopUsers.map((su) => ({
      id: su.shopId,
      name: su.shop.name,
      logoUrl: su.shop.logoUrl,
      roles: su.roles,
      subscriptionStatus: su.shop.subscriptionStatus,
    }));

    const preAuthToken = this.signPreAuthToken(user);
    return { preAuthToken, shops };
  }

  /**
   * Step 2 of login.
   * Validates the pre_auth token, confirms the user has access to the
   * requested shop, checks subscription, then issues a full scoped token pair.
   */
  async selectShop(
    dto: SelectShopDto,
    preAuthToken: string,
    clientIp: string,
  ): Promise<TokensDto> {
    const payload = this.verifyPreAuthToken(preAuthToken);

    const shopUser = await this.shopUserRepo.findOne({
      where: { userId: payload.sub, shopId: dto.shopId, isActive: true },
      relations: ['shop'],
    });

    if (!shopUser) {
      throw new ForbiddenException('You do not have access to this shop.');
    }

    this.assertSubscriptionActive(shopUser.shop);

    const user = await this.usersService.findById(payload.sub);

    // Invalidate any existing sessions for this user to prevent ghost sessions
    await this.logoutAll(user.id);

    const [tokens] = await Promise.all([
      this.issueTokens(user, clientIp, dto.shopId, shopUser.roles),
      this.usersService.updateLastLogin(user.id),
    ]);

    // Carry over active shift info as a hint to the client
    const activeShift = await this.shiftsService.getActiveShift(user.id, dto.shopId);
    if (activeShift) {
      tokens.message = "Faol smena tiklandi";
    }

    return tokens;
  }

  /**
   * Switch the authenticated user's active shop.
   * Revokes the current session and issues a new scoped token pair.
   */
  async switchShop(
    currentUser: JwtPayload,
    dto: SelectShopDto,
    clientIp: string,
  ): Promise<TokensDto> {
    const shopUser = await this.shopUserRepo.findOne({
      where: { userId: currentUser.sub, shopId: dto.shopId, isActive: true },
      relations: ['shop'],
    });

    if (!shopUser) {
      throw new ForbiddenException('You do not have access to this shop.');
    }

    this.assertSubscriptionActive(shopUser.shop);

    // Revoke only the current session, not all sessions
    await this.logout(currentUser.sub, currentUser.sessionId);

    const user = await this.usersService.findById(currentUser.sub);
    return this.issueTokens(user, clientIp, dto.shopId, shopUser.roles);
  }

  async refresh(refreshToken: string, clientIp: string): Promise<TokensDto> {
    const stored = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    if (stored.revokedAt) {
      // Possible token reuse attack — revoke entire family
      await this.revokeFamily(stored.familyId);
      throw new ForbiddenException('Token reuse detected');
    }

    // Retrieve the shop roles fresh (they might have changed since last login)
    let shopRoles: UserRole[] | undefined;
    if (stored.shopId) {
      const shopUser = await this.shopUserRepo.findOne({
        where: { userId: stored.user.id, shopId: stored.shopId, isActive: true },
      });
      if (!shopUser) {
        // User was removed from the shop — revoke immediately
        await this.refreshTokenRepo.update(stored.id, { revokedAt: new Date() });
        throw new UnauthorizedException('Shop access revoked');
      }
      shopRoles = shopUser.roles;
    }

    // Rotate: revoke old, issue new
    await this.refreshTokenRepo.update(stored.id, { revokedAt: new Date() });
    return this.issueTokens(
      stored.user,
      clientIp,
      stored.shopId ?? null,
      shopRoles,
      stored.familyId,
    );
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { user: { id: userId }, sessionId },
      { revokedAt: new Date() },
    );
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { user: { id: userId } },
      { revokedAt: new Date() },
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async issueTokens(
    user: User,
    clientIp: string,
    shopId: string | null,
    shopRoles?: UserRole[],
    familyId?: string,
  ): Promise<TokensDto> {
    const sessionId = randomUUID();
    const family    = familyId ?? randomUUID();

    // SUPER_ADMIN carries their own roles; shop users carry their per-shop roles
    const roles = user.roles.includes(UserRole.SUPER_ADMIN)
      ? user.roles
      : (shopRoles ?? [UserRole.CASHIER]);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
      sessionId,
      shopId,
      type: 'access',
    };

    const accessToken = this.jwtService.sign(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenValue = randomUUID();
    const tokenHash = await bcrypt.hash(refreshTokenValue, 10);

    const rt = this.refreshTokenRepo.create({
      token: tokenHash,
      sessionId,
      familyId: family,
      expiresAt,
      clientIp,
      shopId: shopId ?? undefined,
      user,
    });
    await this.refreshTokenRepo.save(rt);

    return { accessToken, refreshToken: refreshTokenValue, expiresIn: 900 };
  }

  private signPreAuthToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      sessionId: randomUUID(),
      type: 'pre_auth',
    };
    // Intentionally short-lived — just enough to complete shop selection
    return this.jwtService.sign(payload, { expiresIn: '5m' });
  }

  private verifyPreAuthToken(token: string): JwtPayload {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      if (payload.type !== 'pre_auth') {
        throw new UnauthorizedException('Invalid token type for this operation');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Pre-auth token is invalid or expired');
    }
  }

  private assertSubscriptionActive(shop: Shop): void {
    if (shop.subscriptionStatus === SubscriptionStatus.SUSPENDED) {
      throw new ForbiddenException('This shop has been suspended. Contact support.');
    }
    if (shop.subscriptionStatus === SubscriptionStatus.EXPIRED) {
      throw new HttpException(
        'Shop subscription has expired. Please renew.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokenRepo.update({ familyId }, { revokedAt: new Date() });
  }
}
