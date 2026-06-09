import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto, businessId: string) {
    try {
      return await this.prisma.supplier.create({
        data: { ...dto, businessId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Supplier "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async findAll(
    businessId: string,
    isActive?: boolean,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.SupplierWhereInput = {
      businessId,
      ...(isActive !== undefined ? { isActive } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, businessId } });
    if (!supplier) throw new NotFoundException(`Supplier #${id} not found`);
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto, businessId: string) {
    await this.findOne(id, businessId);
    try {
      return await this.prisma.supplier.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Supplier name "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    const poCount = await this.prisma.purchaseOrder.count({ where: { supplierId: id } });
    if (poCount > 0) {
      throw new BadRequestException('Cannot delete supplier with existing purchase orders');
    }
    return this.prisma.supplier.delete({ where: { id } });
  }
}
