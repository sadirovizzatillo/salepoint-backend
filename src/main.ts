import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyRateLimit from '@fastify/rate-limit';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: false, // Winston handles logging
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10 MB
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  const config = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // ── Security ────────────────────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
  });

  await app.register(fastifyCompress, { encodings: ['gzip', 'deflate'] });

  await app.register(fastifyRateLimit, {
    max: config.get<number>('throttle.limit'),
    timeWindow: config.get<number>('throttle.ttl')! * 1000,
    redis: app.get('REDIS_CLIENT'),
  });

  // ── CORS ────────────────────────────────────────────────────
  app.enableCors({
    origin: [
      ...config.get<string[]>('app.cashierOrigins')!,
      ...config.get<string[]>('app.dashboardOrigins')!,
      ...config.get<string[]>('app.consoleOrigins')!,
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Type'],
    credentials: true,
    maxAge: 86400,
  });

  // ── API Versioning ───────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api');

  // ── Validation ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Filters & Interceptors ───────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new ResponseInterceptor(),
  );

  // ── Swagger ─────────────────────────────────────────────────
  if (config.get('app.env') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('POS System API')
      .setDescription(
        'Backend for Cashier (cashier.url.com) & Dashboard (dashboard.url.com)',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & sessions')
      .addTag('cashier', 'Cashier-facing endpoints')
      .addTag('dashboard', 'Dashboard & analytics endpoints')
      .addTag('products', 'Product catalog management')
      .addTag('orders', 'Order lifecycle management')
      .addTag('payments', 'Payment processing')
      .addTag('inventory', 'Stock management')
      .addTag('reports', 'Reporting & analytics')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('app.port')!;
  const host = '0.0.0.0';

  await app.listen(port, host);
  logger.log(`🚀 POS Backend running on ${await app.getUrl()}`, 'Bootstrap');
  logger.log(`📚 Swagger docs at ${await app.getUrl()}/api/docs`, 'Bootstrap');
}

bootstrap();
