import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  paginate,
  PaginatedResult,
  PaginationQueryDto,
} from '@common/utils/pagination.util';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerDto, shopId: string): Promise<Customer> {
    return this.customerRepo.save(this.customerRepo.create({ ...dto, shopId }));
  }

  async findAll(shopId: string | null, query: PaginationQueryDto): Promise<PaginatedResult<Customer>> {
    const qb = this.customerRepo
      .createQueryBuilder('c')
      .orderBy('c.name', 'ASC');

    if (shopId) qb.andWhere('c.shopId = :shopId', { shopId });
    if (query.search) {
      qb.andWhere('c.name ILIKE :s OR c.phone ILIKE :s', { s: `%${query.search}%` });
    }

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return paginate(items, total, query);
  }

  async findById(id: string, shopId?: string | null): Promise<Customer> {
    const where: FindOptionsWhere<Customer> = { id };
    if (shopId) where.shopId = shopId;

    const c = await this.customerRepo.findOne({ where });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async findByPhone(phone: string, shopId: string): Promise<Customer | null> {
    return this.customerRepo.findOne({ where: { phone, shopId } });
  }

  async update(id: string, dto: UpdateCustomerDto, shopId: string): Promise<Customer> {
    const customer = await this.findById(id, shopId);
    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  async addLoyaltyPoints(id: string, points: number): Promise<void> {
    await this.customerRepo.increment({ id }, 'loyaltyPoints', points);
  }

  async recordVisit(id: string, amountSpent: number): Promise<void> {
    await this.customerRepo
      .createQueryBuilder()
      .update(Customer)
      .set({
        visitCount: () => '"visit_count" + 1',
        totalSpent: () => `"total_spent" + ${amountSpent}`,
      })
      .where('id = :id', { id })
      .execute();
  }
}
