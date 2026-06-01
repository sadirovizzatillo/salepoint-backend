import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCustomerDefaultDiscount
 *
 * Lets a shop give a specific customer a default discount that is auto-applied
 * to every order for them (still overridable per-order by the cashier).
 *
 *   - customers.default_discount_type   orders_discount_type_enum  (percent | fixed)
 *   - customers.default_discount_value  numeric(8, 2)
 *
 * Both columns are nullable — null means "no default discount".
 */
export class AddCustomerDefaultDiscount1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
        ADD COLUMN default_discount_type  orders_discount_type_enum,
        ADD COLUMN default_discount_value numeric(8, 2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
        DROP COLUMN default_discount_value,
        DROP COLUMN default_discount_type
    `);
  }
}
