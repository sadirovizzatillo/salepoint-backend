import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';

import { Debt, DebtRepayment, DebtStatus } from './entities/debt.entity';
import { Order, OrderStatus } from '@modules/orders/entities/order.entity';
import { RepayDebtDto } from './dto/repay-debt.dto';
import {
  paginate,
  PaginatedResult,
  PaginationQueryDto,
} from '@common/utils/pagination.util';

export interface DebtorSummary {
  customerId: string;
  customerName: string;
  phone: string | null;
  totalRemaining: number;
  debtCount: number;
  oldestDebtAt: Date;
}

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt)
    private readonly debtRepo: Repository<Debt>,
    @InjectRepository(DebtRepayment)
    private readonly repaymentRepo: Repository<DebtRepayment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async createFromOrder(
    order: Order,
    cashierId: string,
    em: EntityManager,
  ): Promise<Debt> {
    const debt = em.create(Debt, {
      shopId: order.shopId,     // inherit shop scope from the order
      orderId: order.id,
      customerId: order.customerId,
      cashierId,
      totalDebt: order.notPaid,
      paidAmount: 0,
      remainingAmount: order.notPaid,
      status: DebtStatus.PENDING,
    });
    return em.save(Debt, debt);
  }

  async repay(id: string, dto: RepayDebtDto, cashierId: string, shopId: string): Promise<Debt> {
    const debt = await this.findById(id, shopId);
    if (debt.status === DebtStatus.PAID) {
      throw new BadRequestException('Debt is already fully paid');
    }
    if (dto.amount > Number(debt.remainingAmount)) {
      throw new BadRequestException(
        `Amount exceeds remaining debt of ${debt.remainingAmount}`,
      );
    }

    const repayment = this.repaymentRepo.create({
      debtId: id,
      cashierId,
      amount: dto.amount,
      note: dto.note,
    });
    await this.repaymentRepo.save(repayment);

    const paidAmount      = Number(debt.paidAmount) + dto.amount;
    const remainingAmount = Number(debt.remainingAmount) - dto.amount;
    const status          = remainingAmount === 0 ? DebtStatus.PAID : DebtStatus.PARTIAL;

    await this.debtRepo.update(id, { paidAmount, remainingAmount, status });

    if (status === DebtStatus.PAID) {
      await this.orderRepo.update(debt.orderId, { status: OrderStatus.PAID });
    }

    return this.findById(id, shopId);
  }

  async findAll(
    shopId: string | null,
    query: PaginationQueryDto & {
      customerId?: string;
      status?: DebtStatus;
      cashierId?: string;
      shiftId?: string;
    },
  ): Promise<PaginatedResult<Debt>> {
    const qb = this.debtRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.customer', 'customer')
      .leftJoinAndSelect('d.cashier', 'cashier')
      .leftJoinAndSelect('d.order', 'order')
      .orderBy('d.createdAt', 'DESC');

    if (shopId)         qb.andWhere('d.shopId = :shopId', { shopId });
    if (query.customerId) qb.andWhere('d.customerId = :cid', { cid: query.customerId });
    if (query.status)     qb.andWhere('d.status = :status', { status: query.status });
    if (query.cashierId)  qb.andWhere('d.cashierId = :cashierId', { cashierId: query.cashierId });
    if (query.shiftId)    qb.andWhere('order.shiftId = :shiftId', { shiftId: query.shiftId });

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return paginate(items, total, query);
  }

  async getDebtorsSummary(
    shopId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<DebtorSummary>> {
    const qb = this.debtRepo
      .createQueryBuilder('d')
      .select('d.customer_id',        'customerId')
      .addSelect('customer.name',     'customerName')
      .addSelect('customer.phone',    'phone')
      .addSelect('SUM(d.remaining_amount)', 'totalRemaining')
      .addSelect('COUNT(d.id)',        'debtCount')
      .addSelect('MIN(d.created_at)', 'oldestDebtAt')
      .innerJoin('d.customer', 'customer')
      .where('d.shop_id = :shopId', { shopId })
      .andWhere('d.status IN (:...statuses)', { statuses: [DebtStatus.PENDING, DebtStatus.PARTIAL] })
      .groupBy('d.customer_id')
      .addGroupBy('customer.name')
      .addGroupBy('customer.phone')
      .orderBy('SUM(d.remaining_amount)', 'DESC');

    if (query.search) {
      qb.andWhere('customer.name ILIKE :search', { search: `%${query.search}%` });
    }

    const total = await qb.getCount();
    const raw   = await qb.offset(query.skip).limit(query.limit).getRawMany();

    const data: DebtorSummary[] = raw.map((r) => ({
      customerId:     r.customerId,
      customerName:   r.customerName,
      phone:          r.phone ?? null,
      totalRemaining: Number(r.totalRemaining),
      debtCount:      Number(r.debtCount),
      oldestDebtAt:   new Date(r.oldestDebtAt),
    }));

    return paginate(data, total, query);
  }

  async findById(id: string, shopId?: string | null): Promise<Debt> {
    const where: FindOptionsWhere<Debt> = { id };
    if (shopId) where.shopId = shopId;

    const debt = await this.debtRepo.findOne({
      where,
      relations: ['customer', 'cashier', 'order', 'order.items', 'repayments', 'repayments.cashier'],
    });
    if (!debt) throw new NotFoundException('Debt not found');
    return debt;
  }
}
