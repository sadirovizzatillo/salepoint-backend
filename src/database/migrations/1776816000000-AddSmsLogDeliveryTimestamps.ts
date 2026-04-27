import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSmsLogDeliveryTimestamps1776816000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sms_logs
        ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS failed_at    TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sms_logs
        DROP COLUMN IF EXISTS delivered_at,
        DROP COLUMN IF EXISTS failed_at
    `);
  }
}
