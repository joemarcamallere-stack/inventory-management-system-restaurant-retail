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
exports.PurchaseOrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
let PurchaseOrdersService = class PurchaseOrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, businessId, createdById) {
        const orderNumber = `PO-${Date.now()}`;
        const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
        try {
            return await this.prisma.purchaseOrder.create({
                data: {
                    orderNumber,
                    supplierId: dto.supplierId,
                    notes: dto.notes,
                    paymentMethod: dto.paymentMethod,
                    paymentTerms: dto.paymentTerms,
                    totalAmount,
                    businessId,
                    createdById,
                    items: {
                        create: dto.items.map((item) => ({
                            inventoryItemId: item.inventoryItemId,
                            name: item.name,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.quantity * item.unitPrice,
                        })),
                    },
                },
                include: this.poInclude,
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException(`Order number "${orderNumber}" already exists`);
            }
            throw error;
        }
    }
    async findAll(businessId, status, supplierId, page = 1, limit = 50) {
        const where = {
            businessId,
            ...(status ? { status: status } : {}),
            ...(supplierId ? { supplierId } : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.purchaseOrder.findMany({
                where,
                include: this.poInclude,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.purchaseOrder.count({ where }),
        ]);
        return (0, pagination_dto_1.paginate)(data, total, page, limit);
    }
    async findOne(id, businessId) {
        const po = await this.prisma.purchaseOrder.findFirst({
            where: { id, businessId },
            include: this.poInclude,
        });
        if (!po)
            throw new common_1.NotFoundException(`Purchase order #${id} not found`);
        return po;
    }
    async update(id, dto, businessId) {
        const po = await this.findOne(id, businessId);
        if (!['DRAFT', 'SUBMITTED'].includes(po.status)) {
            throw new common_1.BadRequestException('Only DRAFT or SUBMITTED orders can be edited');
        }
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: dto,
            include: this.poInclude,
        });
    }
    async submit(id, businessId) {
        const po = await this.findOne(id, businessId);
        if (po.status !== 'DRAFT') {
            throw new common_1.BadRequestException('Only DRAFT orders can be submitted');
        }
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'SUBMITTED' },
            include: this.poInclude,
        });
    }
    async approve(id, businessId, role) {
        if (!['Admin', 'Manager'].includes(role)) {
            throw new common_1.ForbiddenException('Only Admin or Manager can approve purchase orders');
        }
        const po = await this.findOne(id, businessId);
        if (po.status !== 'SUBMITTED') {
            throw new common_1.BadRequestException('Only SUBMITTED orders can be approved');
        }
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'APPROVED' },
            include: this.poInclude,
        });
    }
    async receive(id, dto, businessId, receivedById) {
        return this.prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findFirst({
                where: { id, businessId },
                include: { items: true },
            });
            if (!po)
                throw new common_1.NotFoundException(`Purchase order #${id} not found`);
            if (po.status !== 'APPROVED') {
                throw new common_1.BadRequestException('Only APPROVED orders can be received');
            }
            for (const receiveItem of dto.items) {
                const poItem = po.items.find((i) => i.id === receiveItem.id);
                if (!poItem)
                    continue;
                if (receiveItem.receivedQty > 0 && poItem.inventoryItemId) {
                    const item = await tx.inventoryItem.findUnique({
                        where: { id: poItem.inventoryItemId },
                    });
                    if (!item)
                        continue;
                    const previousQuantity = item.quantity;
                    const newQuantity = previousQuantity + receiveItem.receivedQty;
                    await tx.inventoryItem.update({
                        where: { id: item.id },
                        data: { quantity: newQuantity },
                    });
                    await tx.stockMovement.create({
                        data: {
                            type: 'STOCK_IN',
                            quantity: receiveItem.receivedQty,
                            previousQuantity,
                            newQuantity,
                            unit: item.unit,
                            reason: 'Purchase order received',
                            referenceType: 'PURCHASE_ORDER',
                            referenceId: po.id,
                            notes: `Received from PO ${po.orderNumber}`,
                            itemId: item.id,
                            locationId: item.locationId,
                            businessId,
                            createdById: receivedById,
                        },
                    });
                }
                await tx.purchaseOrderItem.update({
                    where: { id: receiveItem.id },
                    data: {
                        receivedQty: receiveItem.receivedQty,
                        rejectedQty: receiveItem.rejectedQty,
                    },
                });
            }
            return tx.purchaseOrder.update({
                where: { id },
                data: {
                    status: 'RECEIVED',
                    receivedAt: new Date(),
                    receivedById,
                },
                include: this.poInclude,
            });
        });
    }
    async cancel(id, businessId) {
        const po = await this.findOne(id, businessId);
        if (po.status === 'RECEIVED') {
            throw new common_1.BadRequestException('RECEIVED orders cannot be cancelled');
        }
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: this.poInclude,
        });
    }
    poInclude = {
        supplier: true,
        items: { include: { inventoryItem: true } },
        createdBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
    };
};
exports.PurchaseOrdersService = PurchaseOrdersService;
exports.PurchaseOrdersService = PurchaseOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PurchaseOrdersService);
//# sourceMappingURL=purchase-orders.service.js.map