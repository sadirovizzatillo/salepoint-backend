import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  paginate,
  PaginatedResult,
  PaginationQueryDto,
} from '@common/utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, passwordHash });
    return this.userRepo.save(user);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<User>> {
    const qb = this.userRepo.createQueryBuilder('u').orderBy('u.createdAt', 'DESC');

    if (query.search) {
      qb.where('u.name ILIKE :s OR u.email ILIKE :s', {
        s: `%${query.search}%`,
      });
    }

    const [items, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return paginate(items, total, query);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.password) {
      (dto as any).passwordHash = await bcrypt.hash(dto.password, 12);
      delete (dto as any).password;
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.userRepo.softDelete(id);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  async validatePin(user: User, pin: string): Promise<boolean> {
    if (!user.pinHash) return false;
    return bcrypt.compare(pin, user.pinHash);
  }
}
