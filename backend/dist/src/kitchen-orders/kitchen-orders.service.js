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
exports.KitchenOrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let KitchenOrdersService = class KitchenOrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async complete(createKitchenOrderDto, businessId, completedById) {
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
                throw new common_1.NotFoundException(`Recipe #${createKitchenOrderDto.recipeId} not found`);
            }
            if (recipe.ingredients.length === 0) {
                throw new common_1.BadRequestException('Recipe has no ingredients to deduct');
            }
            const servingFactor = createKitchenOrderDto.quantity / Math.max(recipe.servings, 1);
            const deductions = recipe.ingredients.map((ingredient) => ({
                ingredient,
                requiredQuantity: ingredient.quantity * servingFactor,
            }));
            const insufficientIngredient = deductions.find(({ ingredient, requiredQuantity }) => ingredient.item.quantity < requiredQuantity);
            if (insufficientIngredient) {
                throw new common_1.BadRequestException(`${insufficientIngredient.ingredient.item.name} does not have enough stock`);
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
    async findAll(businessId, status) {
        return this.prisma.kitchenOrder.findMany({
            where: {
                businessId,
                ...(status === 'COMPLETED' || status === 'VOIDED' ? { status } : {}),
            },
            include: this.kitchenOrderInclude,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, businessId) {
        const order = await this.prisma.kitchenOrder.findFirst({
            where: { id, businessId },
            include: this.kitchenOrderInclude,
        });
        if (!order)
            throw new common_1.NotFoundException(`Kitchen order #${id} not found`);
        return order;
    }
    async void(id, voidDto, businessId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.kitchenOrder.findFirst({
                where: { id, businessId },
            });
            if (!order)
                throw new common_1.NotFoundException(`Kitchen order #${id} not found`);
            if (order.status === 'VOIDED') {
                throw new common_1.BadRequestException('Kitchen order is already voided');
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
    kitchenOrderInclude = {
        recipe: {
            include: {
                ingredients: {
                    include: { item: true },
                },
            },
        },
        completedBy: true,
    };
};
exports.KitchenOrdersService = KitchenOrdersService;
exports.KitchenOrdersService = KitchenOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KitchenOrdersService);
//# sourceMappingURL=kitchen-orders.service.js.map