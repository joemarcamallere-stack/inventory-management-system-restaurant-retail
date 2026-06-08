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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
let SalesService = class SalesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, businessId, cashierId) {
        return this.prisma.$transaction(async (tx) => {
            const itemIds = dto.items.map((i) => i.inventoryItemId);
            await tx.$queryRaw `
        SELECT id FROM "InventoryItem"
        WHERE id = ANY(${itemIds}::uuid[])
        FOR UPDATE
      `;
            const inventoryItems = await tx.inventoryItem.findMany({
                where: { id: { in: itemIds }, businessId },
            });
            const itemMap = new Map(inventoryItems.map((item) => [item.id, item]));
            for (const saleItem of dto.items) {
                const item = itemMap.get(saleItem.inventoryItemId);
                if (!item) {
                    throw new common_1.NotFoundException(`Inventory item ${saleItem.inventoryItemId} not found`);
                }
                if (item.quantity < saleItem.quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock for "${item.name}" (available: ${item.quantity}, required: ${saleItem.quantity})`);
                }
            }
            const subtotal = dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
            const discount = dto.discount ?? 0;
            const tax = dto.tax ?? 0;
            const total = subtotal - discount + tax;
            const change = Math.max(0, dto.amountPaid - total);
            const transactionNumber = `TXN-${Date.now()}`;
            let sale;
            try {
                sale = await tx.sale.create({
                    data: {
                        transactionNumber,
                        locationId: dto.locationId,
                        cashierId,
                        subtotal,
                        discount,
                        tax,
                        total,
                        paymentMethod: dto.paymentMethod,
                        amountPaid: dto.amountPaid,
                        change,
                        customer: dto.customer,
                        businessId,
                        items: {
                            create: dto.items.map((i) => {
                                const item = itemMap.get(i.inventoryItemId);
                                return {
                                    inventoryItemId: i.inventoryItemId,
                                    name: item.name,
                                    quantity: i.quantity,
                                    unitPrice: i.unitPrice,
                                    totalPrice: i.quantity * i.unitPrice,
                                };
                            }),
                        },
                    },
                    include: this.saleInclude,
                });
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    throw new common_1.ConflictException(`Transaction number "${transactionNumber}" already exists`);
                }
                throw error;
            }
            for (const saleItem of dto.items) {
                const item = itemMap.get(saleItem.inventoryItemId);
                const previousQuantity = item.quantity;
                const newQuantity = previousQuantity - saleItem.quantity;
                await tx.inventoryItem.update({
                    where: { id: item.id },
                    data: { quantity: newQuantity },
                });
                await tx.stockMovement.create({
                    data: {
                        type: 'SALE',
                        quantity: saleItem.quantity,
                        previousQuantity,
                        newQuantity,
                        unit: item.unit,
                        reason: 'Point of sale',
                        referenceType: 'SALE',
                        referenceId: sale.id,
                        notes: `Sale ${transactionNumber}`,
                        itemId: item.id,
                        locationId: dto.locationId,
                        businessId,
                        createdById: cashierId,
                    },
                });
                itemMap.set(item.id, { ...item, quantity: newQuantity });
            }
            return sale;
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    }
    async findAll(businessId, locationId, status, dateFrom, dateTo, page = 1, limit = 50) {
        const where = {
            businessId,
            ...(locationId ? { locationId } : {}),
            ...(status ? { status: status } : {}),
            ...(dateFrom || dateTo
                ? {
                    createdAt: {
                        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                        ...(dateTo ? { lte: new Date(dateTo) } : {}),
                    },
                }
                : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.sale.findMany({
                where,
                include: this.saleInclude,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.sale.count({ where }),
        ]);
        return (0, pagination_dto_1.paginate)(data, total, page, limit);
    }
    async findOne(id, businessId) {
        const sale = await this.prisma.sale.findFirst({
            where: { id, businessId },
            include: this.saleInclude,
        });
        if (!sale)
            throw new common_1.NotFoundException(`Sale #${id} not found`);
        return sale;
    }
    async refund(id, refundReason, businessId, refundedById) {
        return this.prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findFirst({
                where: { id, businessId },
                include: { items: true },
            });
            if (!sale)
                throw new common_1.NotFoundException(`Sale #${id} not found`);
            if (sale.status !== 'COMPLETED') {
                throw new common_1.BadRequestException('Only COMPLETED sales can be refunded');
            }
            const itemIds = sale.items.map((i) => i.inventoryItemId);
            await tx.$queryRaw `
        SELECT id FROM "InventoryItem"
        WHERE id = ANY(${itemIds}::uuid[])
        FOR UPDATE
      `;
            for (const saleItem of sale.items) {
                const item = await tx.inventoryItem.findUnique({ where: { id: saleItem.inventoryItemId } });
                if (!item)
                    continue;
                const previousQuantity = item.quantity;
                const newQuantity = previousQuantity + saleItem.quantity;
                await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: newQuantity } });
                await tx.stockMovement.create({
                    data: {
                        type: 'VOID_RESTOCK',
                        quantity: saleItem.quantity,
                        previousQuantity,
                        newQuantity,
                        unit: item.unit,
                        reason: refundReason,
                        referenceType: 'SALE',
                        referenceId: sale.id,
                        notes: `Refund for sale ${sale.transactionNumber}`,
                        itemId: item.id,
                        locationId: sale.locationId,
                        businessId,
                        createdById: refundedById,
                    },
                });
            }
            return tx.sale.update({
                where: { id },
                data: { status: 'REFUNDED', refundReason },
                include: this.saleInclude,
            });
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    }
    saleInclude = {
        location: true,
        cashier: { select: { id: true, name: true } },
        items: { include: { inventoryItem: true } },
    };
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesService);
//# sourceMappingURL=sales.service.js.map