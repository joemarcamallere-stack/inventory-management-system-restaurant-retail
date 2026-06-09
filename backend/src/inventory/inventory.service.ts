import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryItemType } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createInventoryDto: CreateInventoryDto,
    businessId: string,
    modules: string[] = [],
  ) {
    this.assertCanUseItemType(createInventoryDto.itemType, modules);
    await this.assertLocationInBusiness(
      createInventoryDto.locationId,
      businessId,
    );

    try {
      return await this.prisma.inventoryItem.create({
        data: { ...createInventoryDto, businessId },
        include: { location: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An item with this SKU already exists in your business');
      }
      throw error;
    }
  }

  async findAll(
    businessId: string,
    search?: string,
    itemType?: string,
    modules: string[] = [],
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    this.assertCanUseItemType(itemType, modules);
    const where = {
      businessId,
      ...(this.isInventoryItemType(itemType) ? { itemType } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { category: { contains: search, mode: 'insensitive' as const } },
              { subcategory: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        include: { location: true },
        orderBy: { dateAdded: 'desc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, businessId },
      include: { location: true },
    });
    if (!item) throw new NotFoundException(`Inventory item #${id} not found`);
    return item;
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
    businessId: string,
    modules: string[] = [],
  ) {
    await this.findOne(id, businessId);
    this.assertCanUseItemType(updateInventoryDto.itemType, modules);
    if (updateInventoryDto.locationId) {
      await this.assertLocationInBusiness(
        updateInventoryDto.locationId,
        businessId,
      );
    }

    return this.prisma.inventoryItem.update({
      where: { id },
      data: updateInventoryDto,
      include: { location: true },
    });
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.inventoryItem.delete({ where: { id } });
  }

  async getStats(businessId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { businessId },
    });
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const availableStock = items
      .filter((i) => i.condition !== 'Damaged')
      .reduce((sum, i) => sum + i.quantity, 0);
    const damagedItems = items
      .filter((i) => i.condition === 'Damaged')
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const lowStockItems = items.filter(
      (i) => i.quantity <= (i.reorderPoint ?? 3) && i.condition !== 'Damaged',
    );
    return {
      totalItems,
      availableStock,
      damagedItems,
      totalValue,
      stockAlerts: lowStockItems.map((i) => ({
        id: i.id,
        itemName: i.name,
        currentStock: i.quantity,
        threshold: i.reorderPoint ?? 5,
        severity: i.quantity <= (i.minStock ?? 1) ? 'critical' : 'low',
      })),
    };
  }

  private async assertLocationInBusiness(locationId: string, businessId: string) {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, businessId },
      select: { id: true },
    });
    if (!location) throw new NotFoundException(`Location #${locationId} not found`);
  }

  private isInventoryItemType(value?: string): value is InventoryItemType {
    return Boolean(
      value &&
        Object.values(InventoryItemType).includes(value as InventoryItemType),
    );
  }

  private assertCanUseItemType(itemType?: string, modules: string[] = []) {
    if (
      itemType &&
      ['INGREDIENT', 'MENU_ITEM', 'SUPPLY'].includes(itemType) &&
      !modules.includes('RESTAURANT')
    ) {
      throw new ForbiddenException('Restaurant module access is required');
    }
  }
}
