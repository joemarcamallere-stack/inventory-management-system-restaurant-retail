import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransferDto, businessId: string, createdById?: string) {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('Source and destination locations must be different');
    }
    const transferNumber = `TRF-${Date.now()}`;
    try {
      return await this.prisma.transfer.create({
        data: {
          transferNumber,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          notes: dto.notes,
          businessId,
          createdById,
          items: {
            create: dto.items.map((item) => ({
              inventoryItemId: item.inventoryItemId,
              quantity: item.quantity,
            })),
          },
        },
        include: this.transferInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Transfer number "${transferNumber}" already exists`);
      }
      throw error;
    }
  }

  async findAll(
    businessId: string,
    status?: string,
    fromLocationId?: string,
    toLocationId?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.TransferWhereInput = {
      businessId,
      ...(status ? { status: status as any } : {}),
      ...(fromLocationId ? { fromLocationId } : {}),
      ...(toLocationId ? { toLocationId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.transfer.findMany({
        where,
        include: this.transferInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transfer.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string) {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id, businessId },
      include: this.transferInclude,
    });
    if (!transfer) throw new NotFoundException(`Transfer #${id} not found`);
    return transfer;
  }

  async dispatch(id: string, businessId: string) {
    const transfer = await this.findOne(id, businessId);
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING transfers can be dispatched');
    }
    return this.prisma.transfer.update({
      where: { id },
      data: { status: 'IN_TRANSIT' },
      include: this.transferInclude,
    });
  }

  async complete(id: string, businessId: string, completedById?: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({
        where: { id, businessId },
        include: { items: true },
      });
      if (!transfer) throw new NotFoundException(`Transfer #${id} not found`);
      if (transfer.status !== 'IN_TRANSIT') {
        throw new BadRequestException('Only IN_TRANSIT transfers can be completed');
      }

      // Lock all inventory rows involved before reading quantities
      const itemIds = transfer.items.map((i) => i.inventoryItemId);
      await tx.$queryRaw`
        SELECT id FROM "InventoryItem"
        WHERE id = ANY(${itemIds}::uuid[])
        FOR UPDATE
      `;

      for (const transferItem of transfer.items) {
        const item = await tx.inventoryItem.findUnique({
          where: { id: transferItem.inventoryItemId },
        });
        if (!item) continue;

        if (item.quantity < transferItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${item.name}" (available: ${item.quantity}, required: ${transferItem.quantity})`,
          );
        }

        const previousQuantity = item.quantity;
        const newQuantity = previousQuantity - transferItem.quantity;

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: newQuantity },
        });

        await tx.stockMovement.create({
          data: {
            type: 'TRANSFER_OUT',
            quantity: transferItem.quantity,
            previousQuantity,
            newQuantity,
            unit: item.unit,
            reason: 'Stock transfer out',
            referenceType: 'TRANSFER',
            referenceId: transfer.id,
            notes: `Transfer ${transfer.transferNumber} out`,
            itemId: item.id,
            locationId: transfer.fromLocationId,
            businessId,
            createdById: completedById,
          },
        });

        await tx.stockMovement.create({
          data: {
            type: 'TRANSFER_IN',
            quantity: transferItem.quantity,
            previousQuantity: 0,
            newQuantity: transferItem.quantity,
            unit: item.unit,
            reason: 'Stock transfer in',
            referenceType: 'TRANSFER',
            referenceId: transfer.id,
            notes: `Transfer ${transfer.transferNumber} in`,
            itemId: item.id,
            locationId: transfer.toLocationId,
            businessId,
            createdById: completedById,
          },
        });
      }

      return tx.transfer.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: this.transferInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancel(id: string, businessId: string) {
    const transfer = await this.findOne(id, businessId);
    if (!['PENDING', 'IN_TRANSIT'].includes(transfer.status)) {
      throw new BadRequestException('Only PENDING or IN_TRANSIT transfers can be cancelled');
    }
    return this.prisma.transfer.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.transferInclude,
    });
  }

  private readonly transferInclude = {
    fromLocation: true,
    toLocation: true,
    items: { include: { inventoryItem: true } },
    createdBy: { select: { id: true, name: true } },
  };
}
