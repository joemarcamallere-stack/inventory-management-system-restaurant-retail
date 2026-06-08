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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_dto_1 = require("../common/dto/pagination.dto");
let SuppliersService = class SuppliersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, businessId) {
        try {
            return await this.prisma.supplier.create({
                data: { ...dto, businessId },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException(`Supplier "${dto.name}" already exists`);
            }
            throw error;
        }
    }
    async findAll(businessId, isActive, page = 1, limit = 50) {
        const where = {
            businessId,
            ...(isActive !== undefined ? { isActive } : {}),
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.supplier.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.supplier.count({ where }),
        ]);
        return (0, pagination_dto_1.paginate)(data, total, page, limit);
    }
    async findOne(id, businessId) {
        const supplier = await this.prisma.supplier.findFirst({ where: { id, businessId } });
        if (!supplier)
            throw new common_1.NotFoundException(`Supplier #${id} not found`);
        return supplier;
    }
    async update(id, dto, businessId) {
        await this.findOne(id, businessId);
        try {
            return await this.prisma.supplier.update({ where: { id }, data: dto });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException(`Supplier name "${dto.name}" already exists`);
            }
            throw error;
        }
    }
    async remove(id, businessId) {
        await this.findOne(id, businessId);
        const poCount = await this.prisma.purchaseOrder.count({ where: { supplierId: id } });
        if (poCount > 0) {
            throw new common_1.BadRequestException('Cannot delete supplier with existing purchase orders');
        }
        return this.prisma.supplier.delete({ where: { id } });
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map