import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSmsLogs1776556800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE sms_status_enum AS ENUM ('pending', 'sent', 'delivered', 'failed')
    `);

    await queryRunner.query(`
      CREATE TABLE sms_logs (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id              UUID,
        customer_id          UUID,
        debt_id              UUID,
        phone                VARCHAR(30)  NOT NULL,
        message              TEXT         NOT NULL,
        status               sms_status_enum NOT NULL DEFAULT 'pending',
        provider             VARCHAR(30)  NOT NULL DEFAULT 'devsms',
        provider_sms_id      INTEGER,
        provider_request_id  VARCHAR(100),
        attempts             INTEGER      NOT NULL DEFAULT 0,
        error_message        TEXT,
        sent_at              TIMESTAMPTZ,
        created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_sms_logs_shop_id    ON sms_logs (shop_id)`);
    await queryRunner.query(`CREATE INDEX idx_sms_logs_customer_id ON sms_logs (customer_id)`);
    await queryRunner.query(`CREATE INDEX idx_sms_logs_debt_id     ON sms_logs (debt_id)`);
    await queryRunner.query(`CREATE INDEX idx_sms_logs_status      ON sms_logs (status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sms_logs`);
    await queryRunner.query(`DROP TYPE IF EXISTS sms_status_enum`);
  }
}
