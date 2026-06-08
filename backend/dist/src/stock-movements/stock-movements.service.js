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
exports.StockMovementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const create_stock_movement_dto_1 = require("./dto/create-stock-movement.dto");
let StockMovementsService = class StockMovementsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createStockMovementDto, businessId, createdById, modules = []) {
        if (createStockMovementDto.quantity <= 0) {
            throw new common_1.BadRequestException('Movement quantity must be greater than zero');
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
                throw new common_1.NotFoundException(`Inventory item #${createStockMovementDto.itemId} not found`);
            }
            const locationId = createStockMovementDto.locationId ?? item.locationId;
            const location = await tx.location.findFirst({
                where: { id: locationId, businessId },
                select: { id: true },
            });
            if (!location) {
                throw new common_1.NotFoundException(`Location #${locationId} not found`);
            }
            const previousQuantity = item.quantity;
            const newQuantity = this.calculateNewQuantity(previousQuantity, createStockMovementDto.quantity, createStockMovementDto.type);
            if (newQuantity < 0) {
                throw new common_1.BadRequestException('Stock movement would make quantity negative');
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
    async findAll(businessId, filters = {}, modules = []) {
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
    async findOne(id, businessId) {
        const movement = await this.prisma.stockMovement.findFirst({
            where: { id, businessId },
            include: {
                item: true,
                location: true,
                createdBy: true,
            },
        });
        if (!movement) {
            throw new common_1.NotFoundException(`Stock movement #${id} not found`);
        }
        return movement;
    }
    calculateNewQuantity(previousQuantity, movementQuantity, type) {
        if ([
            create_stock_movement_dto_1.StockMovementType.StockIn,
            create_stock_movement_dto_1.StockMovementType.TransferIn,
            create_stock_movement_dto_1.StockMovementType.VoidRestock,
        ].includes(type)) {
            return previousQuantity + movementQuantity;
        }
        if (type === create_stock_movement_dto_1.StockMovementType.Adjustment) {
            return movementQuantity;
        }
        return previousQuantity - movementQuantity;
    }
    isStockMovementType(value) {
        return Boolean(value &&
            Object.values(create_stock_movement_dto_1.StockMovementType).includes(value));
    }
    assertCanUseMovementType(type, modules = []) {
        if (type &&
            [
                create_stock_movement_dto_1.StockMovementType.RecipeConsumption,
                create_stock_movement_dto_1.StockMovementType.Spoilage,
                create_stock_movement_dto_1.StockMovementType.Expiry,
            ].includes(type) &&
            !modules.includes('RESTAURANT')) {
            throw new common_1.ForbiddenException('Restaurant module access is required');
        }
    }
};
exports.StockMovementsService = StockMovementsService;
exports.StockMovementsService = StockMovementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StockMovementsService);
//# sourceMappingURL=stock-movements.service.js.map