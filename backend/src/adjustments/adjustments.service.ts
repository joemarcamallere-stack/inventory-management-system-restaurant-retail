import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

@Injectable()
export class AdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdjustmentDto, businessId: string, createdById?: string) {
    const adjustmentNumber = `ADJ-${Date.now()}`;

    const itemIds = [...new Set(dto.items.map((i) => i.inventoryItemId))];
    const count = await this.prisma.inventoryItem.count({
      where: { id: { in: itemIds }, businessId },
    });
    if (count !== itemIds.length) {
      throw new BadRequestException(
        'One or more inventory items are unavailable for this business',
      );
    }

    return this.prisma.stockAdjustment.create({
      data: {
        adjustmentNumber,
        type: dto.type,
        reason: dto.reason,
        businessId,
        createdById,
        items: {
          create: dto.items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            quantityChange: item.quantityChange,
            locationId: item.locationId,
          })),
        },
      },
      include: this.adjustmentInclude,
    });
  }

  async findAll(
    businessId: string,
    status?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.StockAdjustmentWhereInput = {
      businessId,
      ...(status ? { status: status as any } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        where,
        include: this.adjustmentInclude,
        orderBy: { createdAt: 'desc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string) {
    const adj = await this.prisma.stockAdjustment.findFirst({
      where: { id, businessId },
      include: this.adjustmentInclude,
    });
    if (!adj) throw new NotFoundException(`Adjustment #${id} not found`);
    return adj;
  }

  async approve(id: string, businessId: string, role: string, reviewedById?: string) {
    if (!['Admin', 'Manager'].includes(role)) {
      throw new ForbiddenException('Only Admin or Manager can approve adjustments');
    }
    return this.prisma.$transaction(async (tx) => {
      const adj = await tx.stockAdjustment.findFirst({
        where: { id, businessId },
        include: { items: true },
      });
      if (!adj) throw new NotFoundException(`Adjustment #${id} not found`);
      if (adj.status !== 'PENDING') {
        throw new BadRequestException('Only PENDING adjustments can be approved');
      }

      for (const adjItem of adj.items) {
        const item = await tx.inventoryItem.findFirst({
          where: { id: adjItem.inventoryItemId, businessId },
        });
        if (!item) continue;

        const previousQuantity = item.quantity;
        const newQuantity = previousQuantity + adjItem.quantityChange;
        if (newQuantity < 0) {
          throw new BadRequestException(
            `Applying this adjustment would make "${item.name}" quantity negative`,
          );
        }

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: newQuantity },
        });

        await tx.stockMovement.create({
          data: {
            type: 'ADJUSTMENT',
            quantity: Math.abs(adjItem.quantityChange),
            previousQuantity,
            newQuantity,
            unit: item.unit,
            reason: adj.reason,
            referenceType: 'ADJUSTMENT',
            referenceId: adj.id,
            notes: `${adj.type} adjustment: ${adj.adjustmentNumber}`,
            itemId: item.id,
            locationId: adjItem.locationId,
            businessId,
            createdById: reviewedById,
          },
        });
      }

      return tx.stockAdjustment.update({
        where: { id },
        data: { status: 'APPROVED', reviewedById, reviewedAt: new Date() },
        include: this.adjustmentInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async reject(
    id: string,
    businessId: string,
    role: string,
    reason: string,
    reviewedById?: string,
  ) {
    if (!['Admin', 'Manager'].includes(role)) {
      throw new ForbiddenException('Only Admin or Manager can reject adjustments');
    }
    const adj = await this.findOne(id, businessId);
    if (adj.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING adjustments can be rejected');
    }
    return this.prisma.stockAdjustment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        reviewedById,
        reviewedAt: new Date(),
      },
      include: this.adjustmentInclude,
    });
  }

  private readonly adjustmentInclude = {
    createdBy: { select: { id: true, name: true, email: true } },
    reviewedBy: { select: { id: true, name: true, email: true } },
    items: {
      include: {
        inventoryItem: { select: { id: true, name: true, category: true, unit: true } },
        location: { select: { id: true, name: true } },
      },
    },
  };
}
