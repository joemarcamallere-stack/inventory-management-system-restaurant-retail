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
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LocationsService = class LocationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createLocationDto, businessId) {
        const location = await this.prisma.location.create({
            data: { ...createLocationDto, businessId },
        });
        return this.withItemCount(location, 0);
    }
    async findAll(businessId) {
        const locations = await this.prisma.location.findMany({
            where: { businessId },
            include: { _count: { select: { items: true } } },
            orderBy: { name: 'asc' },
        });
        return locations.map((location) => this.withItemCount(location, location._count.items));
    }
    async findOne(id, businessId) {
        const location = await this.prisma.location.findFirst({
            where: { id, businessId },
            include: { _count: { select: { items: true } } },
        });
        if (!location)
            throw new common_1.NotFoundException(`Location #${id} not found`);
        return this.withItemCount(location, location._count.items);
    }
    async update(id, updateLocationDto, businessId) {
        await this.findOne(id, businessId);
        const location = await this.prisma.location.update({
            where: { id },
            data: updateLocationDto,
        });
        const itemCount = await this.prisma.inventoryItem.count({
            where: { locationId: id, businessId },
        });
        return this.withItemCount(location, itemCount);
    }
    async remove(id, businessId) {
        const location = await this.findOne(id, businessId);
        if (location.itemCount > 0) {
            throw new common_1.BadRequestException('Cannot delete a location that still has inventory items');
        }
        return this.prisma.location.delete({ where: { id } });
    }
    withItemCount(location, itemCount) {
        const { _count: _count, ...locationData } = location;
        return { ...locationData, itemCount };
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map