import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
export declare class LocationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createLocationDto: CreateLocationDto, businessId: string): Promise<Omit<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        businessId: string;
        address: string;
        manager: string;
        phone: string;
        itemCount: number;
    }, "_count"> & {
        itemCount: number;
    }>;
    findAll(businessId: string, page?: number, limit?: number): Promise<PaginatedResult<any>>;
    findOne(id: string, businessId: string): Promise<Omit<{
        _count: {
            items: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        businessId: string;
        address: string;
        manager: string;
        phone: string;
        itemCount: number;
    }, "_count"> & {
        itemCount: number;
    }>;
    update(id: string, updateLocationDto: UpdateLocationDto, businessId: string): Promise<Omit<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        businessId: string;
        address: string;
        manager: string;
        phone: string;
        itemCount: number;
    }, "_count"> & {
        itemCount: number;
    }>;
    remove(id: string, businessId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        businessId: string;
        address: string;
        manager: string;
        phone: string;
        itemCount: number;
    }>;
    private withItemCount;
}
