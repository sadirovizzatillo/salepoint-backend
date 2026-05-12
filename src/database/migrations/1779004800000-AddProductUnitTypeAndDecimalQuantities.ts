import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddProductUnitTypeAndDecimalQuantities
 *
 * Adds products.unit_type ('piece' | 'meter' | 'kilogram') and widens every
 * quantity column from int → numeric(14, 3) so cables can be sold by the
 * meter and bulk goods by the kilogram. All existing rows backfill to
 * 'piece' (their effective semantics today).
 *
 * Affected tables:
 *   - products            : add unit_type column
 *   - order_items         : quantity        int → numeric(14, 3)
 *   - storage             : quantity, initial_quantity
 *   - stock_levels        : quantity_on_hand, quantity_reserved, reorder_point
 *   - stock_movements     : quantity, quantity_after
 */
export class AddProductUnitTypeAndDecimalQuantities1779004800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. products.unit_type ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE products_unit_type_enum AS ENUM ('piece', 'meter', 'kilogram')
    `);
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN unit_type products_unit_type_enum NOT NULL DEFAULT 'piece'
    `);

    // ── 2. order_items.quantity ────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE order_items
        ALTER COLUMN quantity TYPE numeric(14, 3) USING quantity::numeric(14, 3)
    `);

    // ── 3. storage ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE storage
        ALTER COLUMN quantity         TYPE numeric(14, 3) USING quantity::numeric(14, 3),
        ALTER COLUMN initial_quantity TYPE numeric(14, 3) USING initial_quantity::numeric(14, 3)
    `);

    // ── 4. stock_levels ────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE stock_levels
        ALTER COLUMN quantity_on_hand  TYPE numeric(14, 3) USING quantity_on_hand::numeric(14, 3),
        ALTER COLUMN quantity_reserved TYPE numeric(14, 3) USING quantity_reserved::numeric(14, 3),
        ALTER COLUMN reorder_point     TYPE numeric(14, 3) USING reorder_point::numeric(14, 3)
    `);

    // ── 5. stock_movements ─────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE stock_movements
        ALTER COLUMN quantity       TYPE numeric(14, 3) USING quantity::numeric(14, 3),
        ALTER COLUMN quantity_after TYPE numeric(14, 3) USING quantity_after::numeric(14, 3)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting int truncates fractional values — only safe if no decimal data exists yet.
    await queryRunner.query(`
      ALTER TABLE stock_movements
        ALTER COLUMN quantity       TYPE integer USING quantity::integer,
        ALTER COLUMN quantity_after TYPE integer USING quantity_after::integer
    `);
    await queryRunner.query(`
      ALTER TABLE stock_levels
        ALTER COLUMN quantity_on_hand  TYPE integer USING quantity_on_hand::integer,
        ALTER COLUMN quantity_reserved TYPE integer USING quantity_reserved::integer,
        ALTER COLUMN reorder_point     TYPE integer USING reorder_point::integer
    `);
    await queryRunner.query(`
      ALTER TABLE storage
        ALTER COLUMN quantity         TYPE integer USING quantity::integer,
        ALTER COLUMN initial_quantity TYPE integer USING initial_quantity::integer
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
        ALTER COLUMN quantity TYPE integer USING quantity::integer
    `);
    await queryRunner.query(`ALTER TABLE products DROP COLUMN unit_type`);
    await queryRunner.query(`DROP TYPE products_unit_type_enum`);
  }
}
