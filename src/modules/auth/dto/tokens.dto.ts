import { UserRole } from '@modules/users/enums/user-role.enum';

export class TokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  message?: string;
}

export class ShopSummaryDto {
  id: string;
  name: string;
  logoUrl?: string;
  roles: UserRole[];
  subscriptionStatus: string;
}

/** Returned by POST /auth/login for non-SUPER_ADMIN users. */
export class PreAuthResponseDto {
  /** Short-lived token (5 min). Use it to call POST /auth/select-shop. */
  preAuthToken: string;
  shops: ShopSummaryDto[];
}
