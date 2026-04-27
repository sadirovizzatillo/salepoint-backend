import { UserRole } from '@modules/users/enums/user-role.enum';

export type JwtTokenType = 'access' | 'pre_auth';

export interface JwtPayload {
  sub: string;          // user id
  email: string;
  roles: UserRole[];
  sessionId: string;
  /**
   * Null for SUPER_ADMIN (no shop scope).
   * Undefined on pre_auth tokens (shop not yet selected).
   */
  shopId?: string | null;
  /** Distinguishes pre-auth (shop selection pending) from full access tokens. */
  type: JwtTokenType;
  iat?: number;
  exp?: number;
}
