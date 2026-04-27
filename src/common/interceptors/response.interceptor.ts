import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        // Allow controllers to return { data, meta } to attach pagination etc.
        const data = payload?.data !== undefined ? payload.data : payload;
        const meta = payload?.meta;

        const response: ApiResponse<T> = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };

        if (meta) response.meta = meta;
        return response;
      }),
    );
  }
}
