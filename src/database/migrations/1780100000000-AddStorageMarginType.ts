import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddStorageMarginType
 *
 * Lets a shop record markup either as a percentage or as a fixed sum per unit.
 *
 *   - storage.margin_type  storage_margin_type_enum  ('percent' | 'fixed'), default 'percent'
 *   - storage.margin       widened from numeric(5, 2) → numeric(12, 2) so it can
 *                          hold absolute currency values, not just a 0–999.99 percentage.
 *
 * Existing rows backfill to 'percent', matching today's behavior.
 */
export class AddStorageMarginType1780100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE storage_margin_type_enum AS ENUM ('percent', 'fixed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE storage
        ALTER COLUMN margin TYPE numeric(12, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE storage
        ADD COLUMN margin_type storage_margin_type_enum NOT NULL DEFAULT 'percent'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE storage DROP COLUMN margin_type`);
    await queryRunner.query(`DROP TYPE storage_margin_type_enum`);
    // numeric(12,2) → numeric(5,2) loses any rows where |margin| > 999.99
    await queryRunner.query(`
      ALTER TABLE storage
        ALTER COLUMN margin TYPE numeric(5, 2) USING margin::numeric(5, 2)
    `);
  }
}
