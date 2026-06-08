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
exports.BundlesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
let BundlesService = class BundlesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    bundleInclude = {
        items: { include: { inventoryItem: { select: { id: true, name: true, price: true, quantity: true, category: true } } } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
    };
    async create(dto, businessId, createdById, role) {
        const inventoryItems = await this.prisma.inventoryItem.findMany({
            where: { id: { in: dto.items.map((i) => i.inventoryItemId) }, businessId },
            select: { id: true, price: true },
        });
        const itemPriceMap = new Map(inventoryItems.map((i) => [i.id, i.price]));
        const originalTotal = dto.items.reduce((sum, i) => sum + (itemPriceMap.get(i.inventoryItemId) ?? 0) * i.quantity, 0);
        const price = originalTotal * (1 - dto.discount / 100);
        const isAdmin = role === 'Admin' || role === 'Manager';
        const status = isAdmin ? 'APPROVED' : 'PENDING';
        return this.prisma.bundlePackage.create({
            data: {
                name: dto.name,
                discount: dto.discount,
                price,
                status: status,
                businessId,
                createdById,
                ...(isAdmin && { approvedById: createdById, approvedAt: new Date() }),
                items: {
                    create: dto.items.map((i) => ({
                        inventoryItemId: i.inventoryItemId,
                        quantity: i.quantity,
                    })),
                },
            },
            include: this.bundleInclude,
        });
    }
    async findAll(businessId, status, page = 1, limit = 50) {
        const where = {
            businessId,
            ...(status ? { status: status } : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.bundlePackage.findMany({
                where,
                include: this.bundleInclude,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.bundlePackage.count({ where }),
        ]);
        return (0, pagination_dto_1.paginate)(data, total, page, limit);
    }
    async findOne(id, businessId) {
        const bundle = await this.prisma.bundlePackage.findFirst({
            where: { id, businessId },
            include: this.bundleInclude,
        });
        if (!bundle)
            throw new common_1.NotFoundException(`Bundle #${id} not found`);
        return bundle;
    }
    async update(id, dto, businessId) {
        const bundle = await this.findOne(id, businessId);
        if (!['PENDING', 'REJECTED'].includes(bundle.status)) {
            throw new common_1.BadRequestException('Only PENDING or REJECTED bundles can be edited');
        }
        return this.prisma.bundlePackage.update({
            where: { id },
            data: {
                ...(dto.name ? { name: dto.name } : {}),
                ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
                status: 'PENDING',
            },
            include: this.bundleInclude,
        });
    }
    async approve(id, businessId, approvedById, role) {
        if (role !== 'Admin' && role !== 'Manager') {
            throw new common_1.ForbiddenException('Only Admin or Manager can approve bundles');
        }
        const bundle = await this.findOne(id, businessId);
        if (bundle.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only PENDING bundles can be approved');
        }
        return this.prisma.bundlePackage.update({
            where: { id },
            data: { status: 'APPROVED', approvedById, approvedAt: new Date(), rejectionReason: null },
            include: this.bundleInclude,
        });
    }
    async reject(id, rejectionReason, businessId, role) {
        if (role !== 'Admin' && role !== 'Manager') {
            throw new common_1.ForbiddenException('Only Admin or Manager can reject bundles');
        }
        const bundle = await this.findOne(id, businessId);
        if (bundle.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only PENDING bundles can be rejected');
        }
        return this.prisma.bundlePackage.update({
            where: { id },
            data: { status: 'REJECTED', rejectionReason },
            include: this.bundleInclude,
        });
    }
    async activate(id, businessId, role) {
        if (role !== 'Admin' && role !== 'Manager') {
            throw new common_1.ForbiddenException('Only Admin or Manager can activate bundles');
        }
        const bundle = await this.findOne(id, businessId);
        if (!['APPROVED', 'INACTIVE'].includes(bundle.status)) {
            throw new common_1.BadRequestException('Only APPROVED or INACTIVE bundles can be activated');
        }
        return this.prisma.bundlePackage.update({
            where: { id },
            data: { status: 'ACTIVE' },
            include: this.bundleInclude,
        });
    }
    async deactivate(id, businessId, role) {
        if (role !== 'Admin' && role !== 'Manager') {
            throw new common_1.ForbiddenException('Only Admin or Manager can deactivate bundles');
        }
        const bundle = await this.findOne(id, businessId);
        if (bundle.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Only ACTIVE bundles can be deactivated');
        }
        return this.prisma.bundlePackage.update({
            where: { id },
            data: { status: 'INACTIVE' },
            include: this.bundleInclude,
        });
    }
    async remove(id, businessId, role) {
        if (role !== 'Admin' && role !== 'Manager') {
            throw new common_1.ForbiddenException('Only Admin or Manager can delete bundles');
        }
        const bundle = await this.findOne(id, businessId);
        if (!['PENDING', 'REJECTED'].includes(bundle.status)) {
            throw new common_1.BadRequestException('Only PENDING or REJECTED bundles can be deleted');
        }
        await this.prisma.bundlePackage.delete({ where: { id } });
    }
};
exports.BundlesService = BundlesService;
exports.BundlesService = BundlesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BundlesService);
//# sourceMappingURL=bundles.service.js.map