import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = JwtPayload>(err: any, user: any): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or expired token');
    }
    // pre_auth tokens must not be used on protected routes.
    // They are only valid for POST /auth/select-shop (which is @Public).
    if ((user as JwtPayload).type === 'pre_auth') {
      throw new UnauthorizedException(
        'Pre-auth token cannot be used here. Complete shop selection first.',
      );
    }
    return user as TUser;
  }
}
