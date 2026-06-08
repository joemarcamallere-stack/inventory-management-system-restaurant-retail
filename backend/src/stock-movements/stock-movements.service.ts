import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStockMovementDto,
  StockMovementType,
} from './dto/create-stock-movement.dto';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createStockMovementDto: CreateStockMovementDto,
    businessId: string,
    createdById?: string,
    modules: string[] = [],
  ) {
    if (createStockMovementDto.quantity <= 0) {
      throw new BadRequestException('Movement quantity must be greater than zero');
    }
    this.assertCanUseMovementType(createStockMovementDto.type, modules);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id: createStockMovementDto.itemId, businessId },
        select: {
          id: true,
          quantity: true,
          unit: true,
          locationId: true,
        },
      });

      if (!item) {
        throw new NotFoundException(
          `Inventory item #${createStockMovementDto.itemId} not found`,
        );
      }

      const locationId = createStockMovementDto.locationId ?? item.locationId;
      const location = await tx.location.findFirst({
        where: { id: locationId, businessId },
        select: { id: true },
      });

      if (!location) {
        throw new NotFoundException(`Location #${locationId} not found`);
      }

      const previousQuantity = item.quantity;
      const newQuantity = this.calculateNewQuantity(
        previousQuantity,
        createStockMovementDto.quantity,
        createStockMovementDto.type,
      );

      if (newQuantity < 0) {
        throw new BadRequestException('Stock movement would make quantity negative');
      }

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: newQuantity,
          ...(locationId !== item.locationId ? { locationId } : {}),
        },
      });

      return tx.stockMovement.create({
        data: {
          type: createStockMovementDto.type,
          quantity: createStockMovementDto.quantity,
          previousQuantity,
          newQuantity,
          unit: item.unit,
          reason: createStockMovementDto.reason,
          referenceType: createStockMovementDto.referenceType,
          referenceId: createStockMovementDto.referenceId,
          notes: createStockMovementDto.notes,
          itemId: item.id,
          locationId,
          businessId,
          createdById,
        },
        include: {
          item: true,
          location: true,
          createdBy: true,
        },
      });
    });
  }

  async findAll(
    businessId: string,
    filters: {
      itemId?: string;
      locationId?: string;
      type?: string;
      referenceType?: string;
      referenceId?: string;
    } = {},
    modules: string[] = [],
  ) {
    this.assertCanUseMovementType(filters.type, modules);
    return this.prisma.stockMovement.findMany({
      where: {
        businessId,
        ...(filters.itemId ? { itemId: filters.itemId } : {}),
        ...(filters.locationId ? { locationId: filters.locationId } : {}),
        ...(this.isStockMovementType(filters.type) ? { type: filters.type } : {}),
        ...(filters.referenceType ? { referenceType: filters.referenceType } : {}),
        ...(filters.referenceId ? { referenceId: filters.referenceId } : {}),
      },
      include: {
        item: true,
        location: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, businessId: string) {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, businessId },
      include: {
        item: true,
        location: true,
        createdBy: true,
      },
    });

    if (!movement) {
      throw new NotFoundException(`Stock movement #${id} not found`);
    }

    return movement;
  }

  private calculateNewQuantity(
    previousQuantity: number,
    movementQuantity: number,
    type: StockMovementType,
  ) {
    if (
      [
        StockMovementType.StockIn,
        StockMovementType.TransferIn,
        StockMovementType.VoidRestock,
      ].includes(type)
    ) {
      return previousQuantity + movementQuantity;
    }

    if (type === StockMovementType.Adjustment) {
      return movementQuantity;
    }

    return previousQuantity - movementQuantity;
  }

  private isStockMovementType(value?: string): value is StockMovementType {
    return Boolean(
      value &&
        Object.values(StockMovementType).includes(value as StockMovementType),
    );
  }

  private assertCanUseMovementType(type?: string, modules: string[] = []) {
    if (
      type &&
      [
        StockMovementType.RecipeConsumption,
        StockMovementType.Spoilage,
        StockMovementType.Expiry,
      ].includes(type as StockMovementType) &&
      !modules.includes('RESTAURANT')
    ) {
      throw new ForbiddenException('Restaurant module access is required');
    }
  }
}
