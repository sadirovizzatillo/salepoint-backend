import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSmsLogSentByUserId1777334400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sms_logs
        ADD COLUMN IF NOT EXISTS sent_by_user_id UUID
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sms_logs_sent_by_user_id"
        ON sms_logs (sent_by_user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sms_logs_sent_by_user_id"`);
    await queryRunner.query(`ALTER TABLE sms_logs DROP COLUMN IF EXISTS sent_by_user_id`);
  }
}
