import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Debt, DebtRepayment } from './entities/debt.entity';
import { Order } from '@modules/orders/entities/order.entity';
import { DebtsService } from './debts.service';
import { DebtsController } from './debts.controller';
import { SmsModule } from '@modules/sms/sms.module';

@Module({
  imports: [TypeOrmModule.forFeature([Debt, DebtRepayment, Order]), SmsModule],
  providers: [DebtsService],
  controllers: [DebtsController],
  exports: [DebtsService],
})
export class DebtsModule {}
