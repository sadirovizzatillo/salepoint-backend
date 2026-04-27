import { WinstonModuleAsyncOptions } from 'nest-winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const winstonConfig: WinstonModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cs: ConfigService) => {
    const level = cs.get<string>('LOG_LEVEL', 'debug');
    const logDir = cs.get<string>('LOG_DIR', './logs');
    const isProduction = cs.get('app.env') === 'production';

    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, context, stack }) => {
        const ctx = context ? `[${context}]` : '';
        return `${timestamp} ${level} ${ctx} ${stack ?? message}`;
      }),
    );

    const jsonFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    return {
      transports: [
        new winston.transports.Console({
          format: isProduction ? jsonFormat : consoleFormat,
        }),
        new (winston.transports as any).DailyRotateFile({
          dirname: logDir,
          filename: 'pos-%DATE%-error.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: jsonFormat,
          maxFiles: '30d',
          zippedArchive: true,
        }),
        new (winston.transports as any).DailyRotateFile({
          dirname: logDir,
          filename: 'pos-%DATE%-combined.log',
          datePattern: 'YYYY-MM-DD',
          format: jsonFormat,
          maxFiles: '14d',
          zippedArchive: true,
        }),
      ],
      level,
    };
  },
};
