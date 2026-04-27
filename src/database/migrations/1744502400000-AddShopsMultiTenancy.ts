import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddShopsMultiTenancy
 *
 * 1.  Creates subscription_status_enum + shops table
 * 2.  Creates shop_users_roles_enum (TypeORM name for ShopUser.roles)
 * 3.  Adds shop_owner to users_roles_enum (TypeORM name for User.roles, lowercase values)
 * 4.  Creates shop_users junction table
 * 5.  Adds shop_id (nullable FK) to all transactional tables
 * 6.  Replaces products.sku global unique constraints with a per-shop composite index
 * 7.  Replaces stock_levels.product_id unique index with a per-shop composite index
 */
export class AddShopsMultiTenancy1744502400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── 1. subscription_status enum ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE subscription_status_enum AS ENUM (
        'trial', 'active', 'expired', 'suspended'
      )
    `);

    // ── 2. shops table ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE shops (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name                    VARCHAR(150) NOT NULL,
        address                 VARCHAR(255),
        phone                   VARCHAR(30),
        email                   VARCHAR(255),
        logo_url                TEXT,
        subscription_status     subscription_status_enum NOT NULL DEFAULT 'trial',
        subscription_expires_at TIMESTAMPTZ,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at              TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_shops_subscription_status ON shops (subscription_status)`,
    );

    // ── 3. shop_users_roles_enum ─────────────────────────────────────────────
    // TypeORM generates this name for ShopUser.roles (table=shop_users, col=roles)
    // Must include shop_owner from the start since that's the whole point of this table
    await queryRunner.query(`
      CREATE TYPE shop_users_roles_enum AS ENUM (
        'super_admin', 'shop_owner', 'admin', 'manager', 'cashier'
      )
    `);

    // ── 4. Add shop_owner to the existing users_roles_enum ───────────────────
    // TypeORM generated this name for User.roles (table=users, col=roles, lowercase values)
    await queryRunner.query(
      `ALTER TYPE users_roles_enum ADD VALUE IF NOT EXISTS 'shop_owner'`,
    );

    // ── 5. shop_users junction table ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE shop_users (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id    UUID        NOT NULL REFERENCES shops(id)  ON DELETE CASCADE,
        user_id    UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        roles      shop_users_roles_enum[] NOT NULL DEFAULT ARRAY['cashier']::shop_users_roles_enum[],
        is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_shop_users UNIQUE (shop_id, user_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_shop_users_user_id ON shop_users (user_id)`,
    );

    // ── 6. Add shop_id to transactional tables ───────────────────────────────
    const tables = [
      'refresh_tokens',
      'products',
      'categories',
      'orders',
      'customers',
      'storage',
      'stock_levels',
      'stock_movements',
      'shifts',
      'debts',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE SET NULL
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_${table}_shop_id" ON "${table}" (shop_id)`,
      );
    }

    // ── 7. Fix products.sku ── drop ALL existing unique constraints on sku ───
    // TypeORM creates: idx_products_sku (via @Index) + products_sku_key (column-level UNIQUE)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_sku`);
    await queryRunner.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key`);
    // Belt-and-suspenders: drop any remaining sku-related unique indexes
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT i.relname AS iname
          FROM pg_index ix
          JOIN pg_class i  ON i.oid  = ix.indexrelid
          JOIN pg_class t  ON t.oid  = ix.indrelid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
          WHERE t.relname = 'products'
            AND ix.indisunique = TRUE
            AND a.attname = 'sku'
        ) LOOP
          EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.iname);
        END LOOP;
      END$$
    `);
    // New per-shop composite unique (only enforced when shop_id is not null)
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_products_shop_sku
        ON products (shop_id, sku)
        WHERE shop_id IS NOT NULL
    `);

    // ── 8. Fix stock_levels ── replace product_id unique with composite ──────
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT i.relname AS iname
          FROM pg_index ix
          JOIN pg_class i ON i.oid = ix.indexrelid
          JOIN pg_class t ON t.oid = ix.indrelid
          WHERE t.relname = 'stock_levels'
            AND ix.indisunique = TRUE
            AND ix.indisprimary = FALSE
        ) LOOP
          EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.iname);
        END LOOP;
      END$$
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_stock_levels_shop_product
        ON stock_levels (shop_id, product_id)
        WHERE shop_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore stock_levels unique index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_levels_shop_product`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_stock_levels_product_id" ON stock_levels (product_id)`,
    );

    // Restore products.sku global unique
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_shop_sku`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_products_sku ON products (sku)`,
    );

    // Remove shop_id columns
    const tables = [
      'refresh_tokens', 'products', 'categories', 'orders', 'customers',
      'storage', 'stock_levels', 'stock_movements', 'shifts', 'debts',
    ];
    for (const table of tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS shop_id`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS shop_users`);
    await queryRunner.query(`DROP TYPE IF EXISTS shop_users_roles_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS shops`);
    await queryRunner.query(`DROP TYPE IF EXISTS subscription_status_enum`);
  }
}
