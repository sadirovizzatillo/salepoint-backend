import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCashierLimitToShops
 *
 * Adds a nullable `cashier_limit` integer column to the shops table.
 * NULL means unlimited (legacy / enterprise).
 * A positive integer caps the number of cashier-role seats for the shop.
 */
export class AddCashierLimitToShops1744588800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shops
        ADD COLUMN IF NOT EXISTS cashier_limit INTEGER DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shops
        DROP COLUMN IF EXISTS cashier_limit
    `);
  }
}
