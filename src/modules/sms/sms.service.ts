import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import { SmsLog, SmsStatus } from './entities/sms-log.entity';
import { SMS_PROVIDER, SmsProvider } from './providers/sms.provider.interface';
import { DevSmsProvider } from './providers/devsms.provider';
import { SmsCallbackDto } from './dto/sms-callback.dto';
import { SmsLogQueryDto } from './dto/sms-log-query.dto';
import { paginate, PaginatedResult } from '@common/utils/pagination.util';
import { Debt, DebtStatus } from '@modules/debts/entities/debt.entity';
import { Shop } from '@modules/shops/entities/shop.entity';

export interface SmsJobData {
  smsLogId: string;
  phone: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @InjectRepository(SmsLog)
    private readonly smsLogRepo: Repository<SmsLog>,
    @InjectRepository(Debt)
    private readonly debtRepo: Repository<Debt>,
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectQueue('sms')
    private readonly smsQueue: Queue,
    @Inject(SMS_PROVIDER)
    private readonly provider: SmsProvider,
    private readonly devSmsProvider: DevSmsProvider,
  ) {}

  async sendDebtReminder(
    customerId: string,
    shopId: string,
    sentByUserId?: string,
  ): Promise<{ queued: true; smsLogId: string }> {
    const debts = await this.debtRepo.find({
      where: [
        { customerId, shopId, status: DebtStatus.PENDING },
        { customerId, shopId, status: DebtStatus.PARTIAL },
      ],
      relations: ['customer'],
    });

    if (!debts.length) {
      throw new NotFoundException('No outstanding debts found for this customer');
    }

    const customer = debts[0].customer;

    if (!customer?.phone) {
      throw new BadRequestException('Customer does not have a phone number');
    }

    const [shop] = await Promise.all([this.shopRepo.findOneBy({ id: shopId })]);

    const totalRemaining = debts.reduce((sum, d) => sum + Number(d.remainingAmount), 0);
    const phone          = customer.phone.replace(/\D/g, '');
    const message        = this.buildReminderMessage(
      customer.name,
      totalRemaining,
      debts.length,
      shop?.name ?? '',
    );

    const smsLog = this.smsLogRepo.create({
      shopId,
      sentByUserId: sentByUserId ?? null,
      customerId,
      phone,
      message,
      status:   SmsStatus.PENDING,
      provider: 'devsms',
    });
    await this.smsLogRepo.save(smsLog);

    await this.smsQueue.add(
      'send-debt-reminder',
      { smsLogId: smsLog.id, phone, message } satisfies SmsJobData,
      {
        attempts:  3,
        backoff:   { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );

    this.logger.log(`SMS reminder queued for customer ${customerId}, smsLog ${smsLog.id}`);
    return { queued: true, smsLogId: smsLog.id };
  }

  async handleCallback(dto: SmsCallbackDto): Promise<void> {
    const log = await this.smsLogRepo.findOne({
      where: { providerSmsId: dto.sms_id },
    });

    if (!log) {
      this.logger.warn(`Callback for unknown sms_id=${dto.sms_id}`);
      return;
    }

    const statusMap: Record<string, SmsStatus> = {
      sent:      SmsStatus.SENT,
      delivered: SmsStatus.DELIVERED,
      failed:    SmsStatus.FAILED,
    };

    log.status = statusMap[dto.status] ?? log.status;
    if (dto.sent_at)      log.sentAt      = new Date(dto.sent_at);
    if (dto.delivered_at) log.deliveredAt = new Date(dto.delivered_at);
    if (dto.failed_at)    log.failedAt    = new Date(dto.failed_at);

    await this.smsLogRepo.save(log);
    this.logger.log(`Callback: sms_id=${dto.sms_id} → ${dto.status}`);
  }

  async findLogs(
    shopId: string,
    query: SmsLogQueryDto,
  ): Promise<{
    data: SmsLog[];
    meta: PaginatedResult<SmsLog>['meta'] & {
      totals: { all: number } & Record<SmsStatus, number>;
      byStatus: Record<SmsStatus, number>;
    };
  }> {
    const findWhere: Record<string, unknown> = { shopId };
    if (query.userId) findWhere.sentByUserId = query.userId;
    if (query.status) findWhere.status = query.status;

    const from = query.from ? new Date(query.from) : null;
    const to   = query.to   ? new Date(query.to)   : null;
    if (from && to) findWhere.createdAt = Between(from, to);
    else if (from)  findWhere.createdAt = MoreThanOrEqual(from);
    else if (to)    findWhere.createdAt = LessThanOrEqual(to);

    const [data, total] = await this.smsLogRepo.findAndCount({
      where: findWhere,
      order: { createdAt: 'DESC' },
      skip:  query.skip,
      take:  query.limit,
    });

    // Per-status counts ignore the status filter so the UI can render all
    // four pills regardless of which one is currently selected.
    const qb = this.smsLogRepo
      .createQueryBuilder('s')
      .select('s.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('s.shop_id = :shopId', { shopId })
      .groupBy('s.status');

    if (query.userId) qb.andWhere('s.sent_by_user_id = :userId', { userId: query.userId });
    if (from)         qb.andWhere('s.created_at >= :from', { from });
    if (to)           qb.andWhere('s.created_at <= :to',   { to });

    const breakdown = await qb.getRawMany<{ status: SmsStatus; count: number }>();

    const byStatus: Record<SmsStatus, number> = {
      [SmsStatus.PENDING]:   0,
      [SmsStatus.SENT]:      0,
      [SmsStatus.DELIVERED]: 0,
      [SmsStatus.FAILED]:    0,
    };
    for (const row of breakdown) byStatus[row.status] = Number(row.count);

    const totals = { all: total, ...byStatus };

    const paginated = paginate(data, total, query);
    return {
      ...paginated,
      meta: { ...paginated.meta, totals, byStatus },
    };
  }

  async getBalance() {
    return this.devSmsProvider.getBalance();
  }

  private buildReminderMessage(customerName: string, totalRemaining: number, debtCount: number, shopName: string): string {
      const formatted = new Intl.NumberFormat('uz-UZ').format(totalRemaining).replace(/\u00A0/g, ' ');
      // const debtPart  = debtCount > 100 ? ` (${debtCount} ta qarz)` : '';
    return `Hurmatli ${customerName}, "${shopName}" do'konidan jami ${formatted} so'm qarzingiz bor. Iltimos, o'z vaqtida to'lang.`;
  }
}
