import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import { Repository } from 'typeorm';

import { SmsLog, SmsStatus } from '@modules/sms/entities/sms-log.entity';
import { SMS_PROVIDER, SmsProvider } from '@modules/sms/providers/sms.provider.interface';
import { SmsJobData } from '@modules/sms/sms.service';

@Processor('sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    @InjectRepository(SmsLog)
    private readonly smsLogRepo: Repository<SmsLog>,
    @Inject(SMS_PROVIDER)
    private readonly provider: SmsProvider,
  ) {}

  @Process('send-debt-reminder')
  async handleSendDebtReminder(job: Job<SmsJobData>): Promise<void> {
    const { smsLogId, phone, message } = job.data;

    const log = await this.smsLogRepo.findOneBy({ id: smsLogId });
    if (!log) {
      this.logger.warn(`sms_log ${smsLogId} not found, skipping`);
      return;
    }

    log.attempts += 1;
    await this.smsLogRepo.save(log);

    const result = await this.provider.send(phone, message);

    log.status            = SmsStatus.SENT;
    log.providerSmsId     = result.smsId;
    log.providerRequestId = result.requestId;
    log.sentAt            = new Date();
    await this.smsLogRepo.save(log);

    this.logger.log(`SMS sent: smsLog=${smsLogId} providerSmsId=${result.smsId}`);
  }

  @OnQueueFailed()
  async onFailed(job: Job<SmsJobData>, error: Error): Promise<void> {
    const { smsLogId } = job.data;
    this.logger.error(`SMS job failed (attempt ${job.attemptsMade}/${job.opts.attempts}): smsLog=${smsLogId}`, error.message);

    // Only mark as failed after all retries are exhausted
    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
      await this.smsLogRepo.update(smsLogId, {
        status:       SmsStatus.FAILED,
        errorMessage: error.message,
      });
      this.logger.error(`SMS permanently failed: smsLog=${smsLogId}`);
    }
  }
}
