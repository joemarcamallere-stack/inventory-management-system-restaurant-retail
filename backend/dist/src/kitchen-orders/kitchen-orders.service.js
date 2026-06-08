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
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
let KitchenOrdersService = class KitchenOrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async complete(createKitchenOrderDto, businessId, completedById) {
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `
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
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    throw new common_1.ConflictException(`Receipt number "${createKitchenOrderDto.receiptNo}" already exists`);
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
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    }
    async findAll(businessId, status, page = 1, limit = 50) {
        const validStatus = status === 'COMPLETED' || status === 'VOIDED'
            ? status
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
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.kitchenOrder.count({ where }),
        ]);
        return (0, pagination_dto_1.paginate)(data, total, page, limit);
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
            await tx.$queryRaw `
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
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
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