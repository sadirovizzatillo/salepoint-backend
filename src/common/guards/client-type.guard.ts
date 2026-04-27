import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CLIENT_TYPE_KEY } from '@common/decorators/client-type.decorator';

export type ClientType = 'cashier' | 'dashboard' | 'console' | 'any';

@Injectable()
export class ClientTypeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<ClientType>(
      CLIENT_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required === 'any') return true;

    const request = context.switchToHttp().getRequest();
    const origin       = request.headers['origin'] ?? '';
    const clientHeader = request.headers['x-client-type'] ?? '';

    const cashierOrigins   = this.configService.get<string[]>('app.cashierOrigins')   ?? [];
    const dashboardOrigins = this.configService.get<string[]>('app.dashboardOrigins') ?? [];
    const consoleOrigins   = this.configService.get<string[]>('app.consoleOrigins')   ?? [];

    const isCashier   = cashierOrigins.includes(origin)   || clientHeader === 'cashier';
    const isDashboard = dashboardOrigins.includes(origin)  || clientHeader === 'dashboard';
    const isConsole   = consoleOrigins.includes(origin)    || clientHeader === 'console';

    if (required === 'cashier'   && isCashier)   return true;
    if (required === 'dashboard' && isDashboard) return true;
    if (required === 'console'   && isConsole)   return true;

    throw new ForbiddenException(
      `This endpoint is restricted to ${required} clients`,
    );
  }
}
