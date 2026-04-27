import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  LoggerService,
  NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = req;
    const requestId = headers['x-request-id'] ?? randomUUID();
    const userAgent = headers['user-agent'] ?? 'unknown';
    const clientType = headers['x-client-type'] ?? 'unknown'; // cashier | dashboard
    const start = Date.now();

    req.headers['x-request-id'] = requestId;

    this.logger.log(
      `→ ${method} ${url} [${clientType}] ${ip} ${userAgent}`,
      'HTTP',
    );

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        this.logger.log(
          `← ${method} ${url} ${res.statusCode} +${Date.now() - start}ms [reqId:${requestId}]`,
          'HTTP',
        );
      }),
      catchError((err) => {
        this.logger.error(
          `← ${method} ${url} ERROR +${Date.now() - start}ms [reqId:${requestId}]`,
          err?.stack,
          'HTTP',
        );
        return throwError(() => err);
      }),
    );
  }
}
