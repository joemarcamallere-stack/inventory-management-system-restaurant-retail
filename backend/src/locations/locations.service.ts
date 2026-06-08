import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createLocationDto: CreateLocationDto, businessId: string) {
    const location = await this.prisma.location.create({
      data: { ...createLocationDto, businessId },
    });
    return this.withItemCount(location, 0);
  }

  async findAll(businessId: string) {
    const locations = await this.prisma.location.findMany({
      where: { businessId },
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    });
    return locations.map((location) =>
      this.withItemCount(location, location._count.items),
    );
  }

  async findOne(id: string, businessId: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, businessId },
      include: { _count: { select: { items: true } } },
    });
    if (!location) throw new NotFoundException(`Location #${id} not found`);
    return this.withItemCount(location, location._count.items);
  }

  async update(
    id: string,
    updateLocationDto: UpdateLocationDto,
    businessId: string,
  ) {
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

  async remove(id: string, businessId: string) {
    const location = await this.findOne(id, businessId);
    if (location.itemCount > 0) {
      throw new BadRequestException(
        'Cannot delete a location that still has inventory items',
      );
    }
    return this.prisma.location.delete({ where: { id } });
  }

  private withItemCount<T extends { _count?: unknown; itemCount?: number }>(
    location: T,
    itemCount: number,
  ) {
    const { _count: _count, ...locationData } = location;
    return { ...locationData, itemCount };
  }
}
