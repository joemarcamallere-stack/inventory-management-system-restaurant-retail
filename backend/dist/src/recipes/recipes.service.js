"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RecipesService = class RecipesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createRecipeDto, businessId) {
        await this.assertRecipeItemsInBusiness(createRecipeDto, businessId);
        return this.prisma.recipe.create({
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
    }
    async findAll(businessId, active) {
        return this.prisma.recipe.findMany({
            where: {
                businessId,
                ...(active === 'true' ? { isActive: true } : {}),
                ...(active === 'false' ? { isActive: false } : {}),
            },
            include: this.recipeInclude,
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id, businessId) {
        const recipe = await this.prisma.recipe.findFirst({
            where: { id, businessId },
            include: this.recipeInclude,
        });
        if (!recipe)
            throw new common_1.NotFoundException(`Recipe #${id} not found`);
        return recipe;
    }
    async update(id, updateRecipeDto, businessId) {
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
    async remove(id, businessId) {
        await this.findOne(id, businessId);
        return this.prisma.recipe.delete({ where: { id } });
    }
    async assertRecipeItemsInBusiness(recipeDto, businessId) {
        const itemIds = [
            ...(recipeDto.ingredients?.map((ingredient) => ingredient.itemId) ?? []),
            ...(recipeDto.menuItemId ? [recipeDto.menuItemId] : []),
        ];
        if (itemIds.length === 0) {
            if (recipeDto.ingredients) {
                throw new common_1.BadRequestException('Recipe must include at least one ingredient');
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
            throw new common_1.NotFoundException('One or more recipe items were not found');
        }
    }
    mapIngredientInputs(ingredients) {
        if (ingredients.length === 0) {
            throw new common_1.BadRequestException('Recipe must include at least one ingredient');
        }
        return ingredients.map((ingredient) => ({
            itemId: ingredient.itemId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            unitCost: ingredient.unitCost,
            totalCost: ingredient.unitCost !== undefined
                ? ingredient.unitCost * ingredient.quantity
                : undefined,
        }));
    }
    recipeInclude = {
        menuItem: true,
        ingredients: {
            include: { item: true },
            orderBy: { createdAt: 'asc' },
        },
    };
};
exports.RecipesService = RecipesService;
exports.RecipesService = RecipesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecipesService);
//# sourceMappingURL=recipes.service.js.map