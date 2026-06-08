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
exports.TransfersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
let TransfersService = class TransfersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, businessId, createdById) {
        if (dto.fromLocationId === dto.toLocationId) {
            throw new common_1.BadRequestException('Source and destination locations must be different');
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
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException(`Transfer number "${transferNumber}" already exists`);
            }
            throw error;
        }
    }
    async findAll(businessId, status, fromLocationId, toLocationId, page = 1, limit = 50) {
        const where = {
            businessId,
            ...(status ? { status: status } : {}),
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
        return (0, pagination_dto_1.paginate)(data, total, page, limit);
    }
    async findOne(id, businessId) {
        const transfer = await this.prisma.transfer.findFirst({
            where: { id, businessId },
            include: this.transferInclude,
        });
        if (!transfer)
            throw new common_1.NotFoundException(`Transfer #${id} not found`);
        return transfer;
    }
    async dispatch(id, businessId) {
        const transfer = await this.findOne(id, businessId);
        if (transfer.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only PENDING transfers can be dispatched');
        }
        return this.prisma.transfer.update({
            where: { id },
            data: { status: 'IN_TRANSIT' },
            include: this.transferInclude,
        });
    }
    async complete(id, businessId, completedById) {
        return this.prisma.$transaction(async (tx) => {
            const transfer = await tx.transfer.findFirst({
                where: { id, businessId },
                include: { items: true },
            });
            if (!transfer)
                throw new common_1.NotFoundException(`Transfer #${id} not found`);
            if (transfer.status !== 'IN_TRANSIT') {
                throw new common_1.BadRequestException('Only IN_TRANSIT transfers can be completed');
            }
            const itemIds = transfer.items.map((i) => i.inventoryItemId);
            await tx.$queryRaw `
        SELECT id FROM "InventoryItem"
        WHERE id = ANY(${itemIds}::uuid[])
        FOR UPDATE
      `;
            for (const transferItem of transfer.items) {
                const item = await tx.inventoryItem.findUnique({
                    where: { id: transferItem.inventoryItemId },
                });
                if (!item)
                    continue;
                if (item.quantity < transferItem.quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock for "${item.name}" (available: ${item.quantity}, required: ${transferItem.quantity})`);
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
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    }
    async cancel(id, businessId) {
        const transfer = await this.findOne(id, businessId);
        if (!['PENDING', 'IN_TRANSIT'].includes(transfer.status)) {
            throw new common_1.BadRequestException('Only PENDING or IN_TRANSIT transfers can be cancelled');
        }
        return this.prisma.transfer.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: this.transferInclude,
        });
    }
    transferInclude = {
        fromLocation: true,
        toLocation: true,
        items: { include: { inventoryItem: true } },
        createdBy: { select: { id: true, name: true } },
    };
};
exports.TransfersService = TransfersService;
exports.TransfersService = TransfersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransfersService);
//# sourceMappingURL=transfers.service.js.map