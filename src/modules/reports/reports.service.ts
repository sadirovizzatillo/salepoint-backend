import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { Order, OrderStatus } from '@modules/orders/entities/order.entity';

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalTax: number;
  totalDiscount: number;
}

export interface SalesByPeriod {
  period: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async getSalesSummary(shopId: string, from: Date, to: Date): Promise<SalesSummary> {
    const cacheKey = `shop:${shopId}:reports:summary:${from.toISOString()}:${to.toISOString()}`;
    const cached = await this.cache.get<SalesSummary>(cacheKey);
    if (cached) return cached;

    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select([
        'COALESCE(SUM(o.total), 0) AS "totalRevenue"',
        'COUNT(o.id) AS "totalOrders"',
        'COALESCE(AVG(o.total), 0) AS "averageOrderValue"',
        'COALESCE(SUM(o.taxAmount), 0) AS "totalTax"',
        'COALESCE(SUM(o.discountAmount), 0) AS "totalDiscount"',
      ])
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne();

    const summary: SalesSummary = {
      totalRevenue:      parseFloat(result.totalRevenue),
      totalOrders:       parseInt(result.totalOrders, 10),
      averageOrderValue: parseFloat(result.averageOrderValue),
      totalTax:          parseFloat(result.totalTax),
      totalDiscount:     parseFloat(result.totalDiscount),
    };

    await this.cache.set(cacheKey, summary, 300);
    return summary;
  }

  async getSalesByDay(shopId: string, from: Date, to: Date): Promise<SalesByPeriod[]> {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select([
        "TO_CHAR(o.createdAt AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS period",
        'COALESCE(SUM(o.total), 0) AS revenue',
        'COUNT(o.id) AS orders',
      ])
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      period:  r.period,
      revenue: parseFloat(r.revenue),
      orders:  parseInt(r.orders, 10),
    }));
  }

  async getSalesByHour(shopId: string, date: Date): Promise<SalesByPeriod[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select([
        "TO_CHAR(o.createdAt AT TIME ZONE 'UTC', 'HH24') AS period",
        'COALESCE(SUM(o.total), 0) AS revenue',
        'COUNT(o.id) AS orders',
      ])
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from: startOfDay, to: endOfDay })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      period:  `${r.period}:00`,
      revenue: parseFloat(r.revenue),
      orders:  parseInt(r.orders, 10),
    }));
  }

  async getTopProducts(shopId: string, from: Date, to: Date, limit = 10): Promise<TopProduct[]> {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'item')
      .select([
        'item.productId AS "productId"',
        'item.name AS name',
        'SUM(item.quantity) AS "quantitySold"',
        'SUM(item.lineTotal) AS revenue',
      ])
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('item.productId, item.name')
      .orderBy('"quantitySold"', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((r) => ({
      productId:    r.productId,
      name:         r.name,
      quantitySold: parseInt(r.quantitySold, 10),
      revenue:      parseFloat(r.revenue),
    }));
  }

  async getSalesByCashier(shopId: string, from: Date, to: Date) {
    return this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.cashier', 'cashier')
      .select([
        'o.cashierId AS "cashierId"',
        'cashier.name AS "cashierName"',
        'COUNT(o.id) AS "orderCount"',
        'SUM(o.total) AS revenue',
      ])
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('o.cashierId, cashier.name')
      .orderBy('revenue', 'DESC')
      .getRawMany();
  }

  async getPaymentMethodBreakdown(shopId: string, from: Date, to: Date) {
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select([
        'COALESCE(SUM(o.paidByCash), 0) AS cash',
        'COALESCE(SUM(o.paidByCard), 0) AS card',
        'COUNT(o.id) AS total_orders',
      ])
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne();

    return [
      { method: 'cash', total: parseFloat(result.cash) },
      { method: 'card', total: parseFloat(result.card) },
    ];
  }
}
