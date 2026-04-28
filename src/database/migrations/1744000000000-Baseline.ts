import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline schema — captures the state that previously existed on dev via
 * TypeORM `synchronize: true` before any migration was written.
 *
 * Idempotent: every CREATE uses IF NOT EXISTS / DO $$ guard, so running this
 * on a dev DB that already has the schema is a no-op (just records the
 * migration in the migrations table). On a fresh DB it builds everything the
 * later 1744502400000-AddShopsMultiTenancy migration assumes already exists.
 */
export class Baseline1744000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extensions ──────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ── Enums ───────────────────────────────────────────────────────────────
    const enums: Array<{ name: string; values: string[] }> = [
      { name: 'users_roles_enum',           values: ['super_admin', 'admin', 'manager', 'cashier'] },
      { name: 'orders_status_enum',         values: ['pending', 'confirmed', 'paid', 'refunded', 'cancelled'] },
      { name: 'orders_discount_type_enum',  values: ['percent', 'fixed'] },
      { name: 'stock_movements_type_enum',  values: ['purchase', 'sale', 'return', 'reserve', 'release', 'adjust', 'transfer'] },
      { name: 'shifts_status_enum',         values: ['open', 'closed'] },
      { name: 'payments_method_enum',       values: ['cash', 'card', 'mobile_money', 'voucher', 'split'] },
      { name: 'payments_status_enum',       values: ['pending', 'completed', 'failed', 'refunded'] },
      { name: 'debts_status_enum',          values: ['pending', 'partial', 'paid'] },
    ];
    for (const e of enums) {
      const literal = e.values.map((v) => `'${v}'`).join(', ');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE ${e.name} AS ENUM (${literal});
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }

    // ── users ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(120) NOT NULL,
        email         VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR NOT NULL,
        roles         users_roles_enum[] NOT NULL DEFAULT ARRAY['cashier']::users_roles_enum[],
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        pin_hash      VARCHAR,
        last_login_at TIMESTAMPTZ,
        avatar_url    VARCHAR,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at    TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)`);

    // ── refresh_tokens ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token      VARCHAR NOT NULL UNIQUE,
        session_id VARCHAR NOT NULL,
        family_id  VARCHAR NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        client_ip  VARCHAR,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "userId"   UUID REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token      ON refresh_tokens (token)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id  ON refresh_tokens (family_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON refresh_tokens (session_id)`);

    // ── categories ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100) NOT NULL,
        description VARCHAR,
        parent_id   UUID REFERENCES categories(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at  TIMESTAMPTZ
      )
    `);

    // ── products ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         VARCHAR(200) NOT NULL,
        description  TEXT,
        sku          VARCHAR(100) NOT NULL UNIQUE,
        barcode      VARCHAR(100),
        price        NUMERIC(12,2) NOT NULL,
        cost_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
        tax_rate     NUMERIC(5,2)  NOT NULL DEFAULT 0,
        is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
        track_stock  BOOLEAN       NOT NULL DEFAULT TRUE,
        image_url    VARCHAR,
        category_id  UUID REFERENCES categories(id),
        attributes   JSONB,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at   TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode)`);

    // ── customers ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name           VARCHAR(150) NOT NULL,
        phone          VARCHAR(30),
        loyalty_points INT  NOT NULL DEFAULT 0,
        total_spent    NUMERIC(14,2) NOT NULL DEFAULT 0,
        visit_count    INT  NOT NULL DEFAULT 0,
        notes          TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at     TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone)`);

    // ── orders + order_items ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number    VARCHAR(30) NOT NULL UNIQUE,
        status          orders_status_enum NOT NULL DEFAULT 'pending',
        subtotal        NUMERIC(12,2) NOT NULL,
        tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
        discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        total           NUMERIC(12,2) NOT NULL,
        discount_type   orders_discount_type_enum,
        discount_value  NUMERIC(8,2),
        notes           TEXT,
        paid_by_cash    NUMERIC(12,2) NOT NULL DEFAULT 0,
        paid_by_card    NUMERIC(12,2) NOT NULL DEFAULT 0,
        not_paid        NUMERIC(12,2) NOT NULL DEFAULT 0,
        cashier_id      UUID REFERENCES users(id),
        customer_id     UUID REFERENCES customers(id),
        shift_id        UUID,
        stock_deducted  BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        name       VARCHAR(200) NOT NULL,
        price      NUMERIC(12,2) NOT NULL,
        quantity   INT NOT NULL,
        tax_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,
        line_total NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    // ── storage ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS storage (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id       UUID NOT NULL REFERENCES products(id),
        quantity         INT NOT NULL,
        initial_quantity INT NOT NULL,
        cost_price       NUMERIC(12,2) NOT NULL,
        margin           NUMERIC(5,2)  NOT NULL DEFAULT 0,
        selling_price    NUMERIC(12,2) NOT NULL,
        notes            TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at       TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_storage_product_id ON storage (product_id)`);

    // ── stock_levels ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_levels (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id         UUID NOT NULL REFERENCES products(id),
        quantity_on_hand   INT NOT NULL DEFAULT 0,
        quantity_reserved  INT NOT NULL DEFAULT 0,
        reorder_point      INT NOT NULL DEFAULT 5,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at         TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_levels_product_id" ON stock_levels (product_id)`,
    );

    // ── stock_movements ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id      UUID NOT NULL REFERENCES products(id),
        type            stock_movements_type_enum NOT NULL,
        quantity        INT NOT NULL,
        quantity_after  INT NOT NULL,
        reference       VARCHAR,
        notes           TEXT,
        performed_by    UUID,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements (product_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_type       ON stock_movements (type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements (created_at)`);

    // ── shifts ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cashier_id     UUID NOT NULL REFERENCES users(id),
        status         shifts_status_enum NOT NULL DEFAULT 'open',
        opening_float  NUMERIC(12,2) NOT NULL,
        closing_float  NUMERIC(12,2),
        cash_sales     NUMERIC(12,2) NOT NULL DEFAULT 0,
        card_sales     NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_sales    NUMERIC(12,2) NOT NULL DEFAULT 0,
        order_count    INT           NOT NULL DEFAULT 0,
        opened_at      TIMESTAMPTZ NOT NULL,
        closed_at      TIMESTAMPTZ,
        notes          TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at     TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_shifts_opened_at ON shifts (opened_at)`);

    // ── payments ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id         UUID NOT NULL REFERENCES orders(id),
        method           payments_method_enum  NOT NULL,
        status           payments_status_enum  NOT NULL DEFAULT 'pending',
        amount           NUMERIC(12,2) NOT NULL,
        amount_tendered  NUMERIC(12,2),
        change_due       NUMERIC(12,2),
        reference_number VARCHAR,
        gateway_response JSONB,
        processed_at     TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at       TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_status   ON payments (status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_method   ON payments (method)`);

    // ── debts + debt_repayments ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id          UUID NOT NULL REFERENCES orders(id),
        customer_id       UUID NOT NULL REFERENCES customers(id),
        cashier_id        UUID NOT NULL REFERENCES users(id),
        total_debt        NUMERIC(12,2) NOT NULL,
        paid_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
        remaining_amount  NUMERIC(12,2) NOT NULL,
        status            debts_status_enum NOT NULL DEFAULT 'pending',
        notes             TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at        TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_debts_customer_id ON debts (customer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_debts_cashier_id  ON debts (cashier_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_debts_status      ON debts (status)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS debt_repayments (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        debt_id     UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
        cashier_id  UUID NOT NULL REFERENCES users(id),
        amount      NUMERIC(12,2) NOT NULL,
        note        TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at  TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_debt_repayments_debt_id    ON debt_repayments (debt_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_debt_repayments_cashier_id ON debt_repayments (cashier_id)`);
  }

  public async down(): Promise<void> {
    // Intentional no-op: this is a baseline. Down would drop the entire DB.
  }
}
