import { UnitType } from '@modules/products/enums/unit-type.enum';

export class ReceiptItemDto {
  name: string;
  quantity: number;
  unitType: UnitType;
  price: number;
  taxRate: number;
  lineTotal: number;
}

export class ReceiptDto {
  orderNumber: string;
  date: Date;
  cashier: string;
  customer?: string;
  items: ReceiptItemDto[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidByCash: number;
  paidByCard: number;
  notPaid: number;
  change: number;
  status: string;
}
