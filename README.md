# POS System Backend

NestJS + Fastify backend serving two client origins:
- **Cashier** → `cashier.url.com`
- **Dashboard** → `dashboard.url.com`

## Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 + Fastify adapter |
| Database | PostgreSQL 16 + TypeORM |
| Cache / Queue | Redis 7 + BullMQ |
| Auth | JWT (access + refresh token rotation) |
| Validation | class-validator + Joi (env schema) |
| Docs | Swagger / OpenAPI |
| Logging | Winston + daily rotate |
| Health | @nestjs/terminus |

## Architecture

```
src/
├── main.ts                     # Bootstrap (Fastify, CORS, Swagger, pipes)
├── app.module.ts               # Root module
├── config/                     # Typed config per domain (app, db, redis, jwt)
├── common/
│   ├── decorators/             # @Public, @Roles, @ForClient, @CurrentUser
│   ├── filters/                # Global HttpExceptionFilter
│   ├── guards/                 # JwtAuthGuard, RolesGuard, ClientTypeGuard
│   ├── interceptors/           # ResponseInterceptor (envelope), LoggingInterceptor
│   └── utils/                  # Pagination helpers
├── database/
│   ├── entities/base.entity.ts # UUID PK + soft-delete timestamps
│   ├── migrations/             # TypeORM migrations
│   └── typeorm.factory.ts
├── cache/                      # Redis client + CacheModule (global)
├── health/                     # /api/health liveness + readiness
├── queue/
│   └── processors/             # Bull job processors (order post-processing)
└── modules/
    ├── auth/                   # Login, JWT pair, refresh rotation, logout
    ├── users/                  # User CRUD, roles, PIN
    ├── products/               # Products + Categories, barcode lookup, Redis cache
    ├── orders/                 # Order lifecycle, transactional stock reservation
    ├── payments/               # Payment processing, refunds, change calculation
    ├── inventory/              # Stock levels, movements, low-stock alerts
    ├── customers/              # Customer CRM, loyalty points
    ├── shifts/                 # Cashier shift open/close, float tracking
    ├── reports/                # Sales analytics (day/hour/product/cashier)
    ├── cashier/                # Gateway module for cashier.url.com
    └── dashboard/              # Gateway module for dashboard.url.com
```

## Client Isolation

Every request carries an `Origin` header and/or `X-Client-Type: cashier|dashboard`.
The `ClientTypeGuard` enforces which endpoints each client can access:

- `@ForClient('cashier')` → only requests from `cashier.url.com`
- `@ForClient('dashboard')` → only requests from `dashboard.url.com`
- Reports and dashboard analytics are exclusively for `dashboard`
- Quick-sale flow is exclusively for `cashier`

## Quick Start

```bash
# 1. Copy env
cp .env.example .env

# 2. Start dependencies
docker-compose up -d postgres redis

# 3. Install
npm install

# 4. Run migrations
npm run migration:run

# 5. Start dev server
npm run start:dev
```

Swagger UI: http://localhost:3000/api/docs

## Full Docker

```bash
docker-compose up --build
```

## Auth Flow

```
POST /api/v1/auth/login          → { accessToken, refreshToken, expiresIn }
POST /api/v1/auth/refresh        → rotated token pair
POST /api/v1/auth/logout         → revoke current session
POST /api/v1/auth/logout-all     → revoke all sessions
```

Access tokens expire in 15 minutes. Refresh tokens use family-based rotation
with reuse detection (suspected theft → entire family revoked).

## Key Design Decisions

- **Pessimistic locking** on stock reservation to prevent overselling
- **Transactional order creation** — items, stock reservation, queue publish in one transaction
- **Async stock deduction** via Bull queue after order confirmation
- **Soft deletes** on all major entities (TypeORM `@DeleteDateColumn`)
- **Snapshot pricing** — `OrderItem` stores name/price at time of sale, not FK to current product price
- **Redis caching** on hot reads (products by ID, reports summaries)
- **Event emitter** for cross-module side effects without coupling (order.created, payment.completed, etc.)
