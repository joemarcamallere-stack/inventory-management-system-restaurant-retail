import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KitchenOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateKitchenOrderDto } from './dto/create-kitchen-order.dto';
import { VoidKitchenOrderDto } from './dto/void-kitchen-order.dto';

@Injectable()
export class KitchenOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async complete(
    createKitchenOrderDto: CreateKitchenOrderDto,
    businessId: string,
    completedById?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Lock ingredient rows so concurrent orders cannot double-deduct the same stock
      await tx.$queryRaw`
        SELECT id FROM "InventoryItem"
        WHERE id IN (
          SELECT "itemId" FROM "RecipeIngredient" WHERE "recipeId" = ${createKitchenOrderDto.recipeId}
        )
        FOR UPDATE
      `;

      const recipe = await tx.recipe.findFirst({
        where: {
          id: createKitchenOrderDto.recipeId,
          businessId,
          isActive: true,
        },
        include: {
          ingredients: {
            include: { item: true },
          },
        },
      });

      if (!recipe) {
        throw new NotFoundException(
          `Recipe #${createKitchenOrderDto.recipeId} not found`,
        );
      }

      if (recipe.ingredients.length === 0) {
        throw new BadRequestException('Recipe has no ingredients to deduct');
      }

      const servingFactor =
        createKitchenOrderDto.quantity / Math.max(recipe.servings, 1);

      const deductions = recipe.ingredients.map((ingredient) => ({
        ingredient,
        requiredQuantity: ingredient.quantity * servingFactor,
      }));

      const insufficientIngredient = deductions.find(
        ({ ingredient, requiredQuantity }) =>
          ingredient.item.quantity < requiredQuantity,
      );

      if (insufficientIngredient) {
        throw new BadRequestException(
          `${insufficientIngredient.ingredient.item.name} does not have enough stock`,
        );
      }

      let order;
      try {
        order = await tx.kitchenOrder.create({
          data: {
            receiptNo: createKitchenOrderDto.receiptNo,
            recipeId: recipe.id,
            quantity: createKitchenOrderDto.quantity,
            notes: createKitchenOrderDto.notes,
            businessId,
            completedById,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException(`Receipt number "${createKitchenOrderDto.receiptNo}" already exists`);
        }
        throw error;
      }

      for (const { ingredient, requiredQuantity } of deductions) {
        const previousQuantity = ingredient.item.quantity;
        const newQuantity = previousQuantity - requiredQuantity;

        await tx.inventoryItem.update({
          where: { id: ingredient.itemId },
          data: { quantity: newQuantity },
        });

        await tx.stockMovement.create({
          data: {
            type: 'RECIPE_CONSUMPTION',
            quantity: requiredQuantity,
            previousQuantity,
            newQuantity,
            unit: ingredient.item.unit ?? ingredient.unit,
            reason: 'Kitchen order recipe consumption',
            referenceType: 'KITCHEN_ORDER',
            referenceId: order.id,
            notes: `Receipt ${order.receiptNo} consumed ${recipe.name}`,
            itemId: ingredient.itemId,
            locationId: ingredient.item.locationId,
            businessId,
            createdById: completedById,
          },
        });
      }

      return tx.kitchenOrder.findUnique({
        where: { id: order.id },
        include: this.kitchenOrderInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findAll(
    businessId: string,
    status?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const validStatus =
      status === 'COMPLETED' || status === 'VOIDED'
        ? (status as KitchenOrderStatus)
        : undefined;
    const where = {
      businessId,
      ...(validStatus ? { status: validStatus } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.kitchenOrder.findMany({
        where,
        include: this.kitchenOrderInclude,
        orderBy: { createdAt: 'desc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.kitchenOrder.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string) {
    const order = await this.prisma.kitchenOrder.findFirst({
      where: { id, businessId },
      include: this.kitchenOrderInclude,
    });

    if (!order) throw new NotFoundException(`Kitchen order #${id} not found`);
    return order;
  }

  async void(id: string, voidDto: VoidKitchenOrderDto, businessId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.kitchenOrder.findFirst({
        where: { id, businessId },
      });

      if (!order) throw new NotFoundException(`Kitchen order #${id} not found`);
      if (order.status === 'VOIDED') {
        throw new BadRequestException('Kitchen order is already voided');
      }

      // Lock the affected inventory rows before restocking
      await tx.$queryRaw`
        SELECT "itemId" FROM "StockMovement"
        WHERE "referenceType" = 'KITCHEN_ORDER'
          AND "referenceId" = ${order.id}
          AND "type" = 'RECIPE_CONSUMPTION'
        FOR UPDATE
      `;

      const sourceMovements = await tx.stockMovement.findMany({
        where: {
          businessId,
          referenceType: 'KITCHEN_ORDER',
          referenceId: order.id,
          type: 'RECIPE_CONSUMPTION',
        },
        include: { item: true },
      });

      for (const movement of sourceMovements) {
        const previousQuantity = movement.item.quantity;
        const newQuantity = previousQuantity + movement.quantity;

        await tx.inventoryItem.update({
          where: { id: movement.itemId },
          data: { quantity: newQuantity },
        });

        await tx.stockMovement.create({
          data: {
            type: 'VOID_RESTOCK',
            quantity: movement.quantity,
            previousQuantity,
            newQuantity,
            unit: movement.unit,
            reason: voidDto.voidReason,
            referenceType: 'KITCHEN_ORDER',
            referenceId: order.id,
            notes: `Void restock for receipt ${order.receiptNo}`,
            itemId: movement.itemId,
            locationId: movement.locationId,
            businessId,
            createdById: order.completedById,
          },
        });
      }

      await tx.kitchenOrder.update({
        where: { id: order.id },
        data: {
          status: 'VOIDED',
          voidReason: voidDto.voidReason,
          voidedAt: new Date(),
        },
      });

      return tx.kitchenOrder.findUnique({
        where: { id: order.id },
        include: this.kitchenOrderInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private readonly kitchenOrderInclude = {
    recipe: {
      include: {
        ingredients: {
          include: { item: true },
        },
      },
    },
    completedBy: true,
  };
}
