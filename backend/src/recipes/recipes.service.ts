import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, paginateQuery, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateRecipeDto, RecipeIngredientDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRecipeDto: CreateRecipeDto, businessId: string) {
    await this.assertRecipeItemsInBusiness(createRecipeDto, businessId);

    try {
      return await this.prisma.recipe.create({
        data: {
          name: createRecipeDto.name,
          category: createRecipeDto.category,
          servings: createRecipeDto.servings,
          yieldPercentage: createRecipeDto.yieldPercentage ?? 100,
          prepTimeMinutes: createRecipeDto.prepTimeMinutes,
          instructions: createRecipeDto.instructions,
          targetFoodCost: createRecipeDto.targetFoodCost,
          sellingPrice: createRecipeDto.sellingPrice,
          isActive: createRecipeDto.isActive ?? true,
          menuItemId: createRecipeDto.menuItemId,
          businessId,
          ingredients: {
            create: this.mapIngredientInputs(createRecipeDto.ingredients),
          },
        },
        include: this.recipeInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`A recipe named "${createRecipeDto.name}" already exists`);
      }
      throw error;
    }
  }

  async findAll(
    businessId: string,
    active?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where = {
      businessId,
      ...(active === 'true' ? { isActive: true } : {}),
      ...(active === 'false' ? { isActive: false } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.recipe.findMany({
        where,
        include: this.recipeInclude,
        orderBy: { name: 'asc' },
        ...paginateQuery(page, limit),
      }),
      this.prisma.recipe.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, businessId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, businessId },
      include: this.recipeInclude,
    });
    if (!recipe) throw new NotFoundException(`Recipe #${id} not found`);
    return recipe;
  }

  async update(id: string, updateRecipeDto: UpdateRecipeDto, businessId: string) {
    await this.findOne(id, businessId);
    await this.assertRecipeItemsInBusiness(updateRecipeDto, businessId);

    return this.prisma.$transaction(async (tx) => {
      if (updateRecipeDto.ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      }

      return tx.recipe.update({
        where: { id },
        data: {
          name: updateRecipeDto.name,
          category: updateRecipeDto.category,
          servings: updateRecipeDto.servings,
          yieldPercentage: updateRecipeDto.yieldPercentage,
          prepTimeMinutes: updateRecipeDto.prepTimeMinutes,
          instructions: updateRecipeDto.instructions,
          targetFoodCost: updateRecipeDto.targetFoodCost,
          sellingPrice: updateRecipeDto.sellingPrice,
          isActive: updateRecipeDto.isActive,
          menuItemId: updateRecipeDto.menuItemId,
          ...(updateRecipeDto.ingredients
            ? {
                ingredients: {
                  create: this.mapIngredientInputs(updateRecipeDto.ingredients),
                },
              }
            : {}),
        },
        include: this.recipeInclude,
      });
    });
  }

  async remove(id: string, businessId: string) {
    await this.findOne(id, businessId);
    return this.prisma.recipe.delete({ where: { id } });
  }

  private async assertRecipeItemsInBusiness(
    recipeDto: Partial<CreateRecipeDto>,
    businessId: string,
  ) {
    const itemIds = [
      ...(recipeDto.ingredients?.map((ingredient) => ingredient.itemId) ?? []),
      ...(recipeDto.menuItemId ? [recipeDto.menuItemId] : []),
    ];

    if (itemIds.length === 0) {
      if (recipeDto.ingredients) {
        throw new BadRequestException('Recipe must include at least one ingredient');
      }
      return;
    }

    const itemCount = await this.prisma.inventoryItem.count({
      where: {
        businessId,
        id: { in: Array.from(new Set(itemIds)) },
      },
    });

    if (itemCount !== new Set(itemIds).size) {
      throw new NotFoundException('One or more recipe items were not found');
    }

    const invalidItems = await this.prisma.inventoryItem.findMany({
      where: {
        businessId,
        id: { in: Array.from(new Set(itemIds)) },
        itemType: 'UKAY_ITEM',
      },
      select: { name: true },
    });

    if (invalidItems.length > 0) {
      throw new BadRequestException(
        `The following items cannot be used as recipe ingredients: ${invalidItems.map((item) => item.name).join(', ')}`,
      );
    }
  }

  private mapIngredientInputs(ingredients: RecipeIngredientDto[]) {
    if (ingredients.length === 0) {
      throw new BadRequestException('Recipe must include at least one ingredient');
    }

    return ingredients.map((ingredient) => ({
      itemId: ingredient.itemId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      unitCost: ingredient.unitCost,
      totalCost:
        ingredient.unitCost !== undefined
          ? ingredient.unitCost * ingredient.quantity
          : undefined,
    }));
  }

  private readonly recipeInclude = {
    menuItem: true,
    ingredients: {
      include: { item: true },
      orderBy: { createdAt: 'asc' as const },
    },
  };
}
