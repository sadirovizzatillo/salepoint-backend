import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';

import { SmsLog } from './entities/sms-log.entity';
import { DevSmsProvider } from './providers/devsms.provider';
import { SMS_PROVIDER } from './providers/sms.provider.interface';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { SmsProcessor } from '@queue/processors/sms.processor';
import { Debt } from '@modules/debts/entities/debt.entity';
import { Shop } from '@modules/shops/entities/shop.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([SmsLog, Debt, Shop]),
    BullModule.registerQueue({ name: 'sms' }),
  ],
  providers: [
    DevSmsProvider,
    { provide: SMS_PROVIDER, useExisting: DevSmsProvider },
    SmsService,
    SmsProcessor,
  ],
  controllers: [SmsController],
  exports: [SmsService],
})
export class SmsModule {}
