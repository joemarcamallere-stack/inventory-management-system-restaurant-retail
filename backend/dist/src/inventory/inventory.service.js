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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const create_inventory_dto_1 = require("./dto/create-inventory.dto");
let InventoryService = class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createInventoryDto, businessId, modules = []) {
        this.assertCanUseItemType(createInventoryDto.itemType, modules);
        await this.assertLocationInBusiness(createInventoryDto.locationId, businessId);
        return this.prisma.inventoryItem.create({
            data: { ...createInventoryDto, businessId },
            include: { location: true },
        });
    }
    async findAll(businessId, search, itemType, modules = []) {
        this.assertCanUseItemType(itemType, modules);
        return this.prisma.inventoryItem.findMany({
            where: {
                businessId,
                ...(this.isInventoryItemType(itemType) ? { itemType } : {}),
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { category: { contains: search, mode: 'insensitive' } },
                            { subcategory: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            include: { location: true },
            orderBy: { dateAdded: 'desc' },
        });
    }
    async findOne(id, businessId) {
        const item = await this.prisma.inventoryItem.findFirst({
            where: { id, businessId },
            include: { location: true },
        });
        if (!item)
            throw new common_1.NotFoundException(`Inventory item #${id} not found`);
        return item;
    }
    async update(id, updateInventoryDto, businessId, modules = []) {
        await this.findOne(id, businessId);
        this.assertCanUseItemType(updateInventoryDto.itemType, modules);
        if (updateInventoryDto.locationId) {
            await this.assertLocationInBusiness(updateInventoryDto.locationId, businessId);
        }
        return this.prisma.inventoryItem.update({
            where: { id },
            data: updateInventoryDto,
            include: { location: true },
        });
    }
    async remove(id, businessId) {
        await this.findOne(id, businessId);
        return this.prisma.inventoryItem.delete({ where: { id } });
    }
    async getStats(businessId) {
        const items = await this.prisma.inventoryItem.findMany({
            where: { businessId },
        });
        const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
        const availableStock = items
            .filter((i) => i.condition !== 'Damaged')
            .reduce((sum, i) => sum + i.quantity, 0);
        const damagedItems = items
            .filter((i) => i.condition === 'Damaged')
            .reduce((sum, i) => sum + i.quantity, 0);
        const totalValue = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const lowStockItems = items.filter((i) => i.quantity <= (i.reorderPoint ?? 3) && i.condition !== 'Damaged');
        return {
            totalItems,
            availableStock,
            damagedItems,
            totalValue,
            stockAlerts: lowStockItems.map((i) => ({
                id: i.id,
                itemName: i.name,
                currentStock: i.quantity,
                threshold: i.reorderPoint ?? 5,
                severity: i.quantity <= (i.minStock ?? 1) ? 'critical' : 'low',
            })),
        };
    }
    async assertLocationInBusiness(locationId, businessId) {
        const location = await this.prisma.location.findFirst({
            where: { id: locationId, businessId },
            select: { id: true },
        });
        if (!location)
            throw new common_1.NotFoundException(`Location #${locationId} not found`);
    }
    isInventoryItemType(value) {
        return Boolean(value &&
            Object.values(create_inventory_dto_1.InventoryItemType).includes(value));
    }
    assertCanUseItemType(itemType, modules = []) {
        if (itemType &&
            ['INGREDIENT', 'MENU_ITEM', 'SUPPLY'].includes(itemType) &&
            !modules.includes('RESTAURANT')) {
            throw new common_1.ForbiddenException('Restaurant module access is required');
        }
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map