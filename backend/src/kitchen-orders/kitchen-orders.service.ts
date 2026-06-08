import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

      const order = await tx.kitchenOrder.create({
        data: {
          receiptNo: createKitchenOrderDto.receiptNo,
          recipeId: recipe.id,
          quantity: createKitchenOrderDto.quantity,
          notes: createKitchenOrderDto.notes,
          businessId,
          completedById,
        },
      });

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
    });
  }

  async findAll(businessId: string, status?: string) {
    return this.prisma.kitchenOrder.findMany({
      where: {
        businessId,
        ...(status === 'COMPLETED' || status === 'VOIDED' ? { status } : {}),
      },
      include: this.kitchenOrderInclude,
      orderBy: { createdAt: 'desc' },
    });
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
    });
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
