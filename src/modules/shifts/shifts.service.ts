import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Shift, ShiftStatus } from './entities/shift.entity';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
  ) {}

  async openShift(dto: OpenShiftDto, cashierId: string, shopId: string): Promise<Shift> {
    const existing = await this.shiftRepo.findOne({
      where: { shopId, cashierId, status: ShiftStatus.OPEN },
    });
    if (existing) {
      throw new BadRequestException('A shift is already open for this cashier');
    }

    const shift = this.shiftRepo.create({
      shopId,
      cashierId,
      openingFloat: dto.openingFloat,
      openedAt: new Date(),
      status: ShiftStatus.OPEN,
      notes: dto.notes,
    });

    return this.shiftRepo.save(shift);
  }

  async closeShift(shiftId: string, dto: CloseShiftDto, cashierId: string, shopId: string): Promise<Shift> {
    const shift = await this.findById(shiftId, shopId);

    if (shift.cashierId !== cashierId) {
      throw new BadRequestException('You can only close your own shift');
    }
    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException('Shift is already closed');
    }

    shift.closingFloat = dto.closingFloat;
    shift.closedAt     = new Date();
    shift.status       = ShiftStatus.CLOSED;
    shift.notes        = dto.notes ?? shift.notes;

    return this.shiftRepo.save(shift);
  }

  async getActiveShift(cashierId: string, shopId: string): Promise<Shift | null> {
    return this.shiftRepo.findOne({
      where: { shopId, cashierId, status: ShiftStatus.OPEN },
    });
  }

  async findById(id: string, shopId?: string | null): Promise<Shift> {
    const where: FindOptionsWhere<Shift> = { id };
    if (shopId) where.shopId = shopId;

    const shift = await this.shiftRepo.findOne({ where, relations: ['cashier'] });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async findByCashier(cashierId: string, shopId: string): Promise<Shift[]> {
    return this.shiftRepo.find({
      where: { shopId, cashierId },
      order: { openedAt: 'DESC' },
      take: 30,
    });
  }

  async findAll(shopId: string | null): Promise<Shift[]> {
    const where: FindOptionsWhere<Shift> = shopId ? { shopId } : {};
    return this.shiftRepo.find({
      where,
      relations: ['cashier'],
      order: { openedAt: 'DESC' },
      take: 50,
    });
  }
}
