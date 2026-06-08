import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
export declare class SuppliersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateSupplierDto, businessId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        businessId: string;
        address: string | null;
        phone: string | null;
        category: string | null;
        isActive: boolean;
        contactPerson: string | null;
    }>;
    findAll(businessId: string, isActive?: boolean, page?: number, limit?: number): Promise<PaginatedResult<any>>;
    findOne(id: string, businessId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        businessId: string;
        address: string | null;
        phone: string | null;
        category: string | null;
        isActive: boolean;
        contactPerson: string | null;
    }>;
    update(id: string, dto: UpdateSupplierDto, businessId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        businessId: string;
        address: string | null;
        phone: string | null;
        category: string | null;
        isActive: boolean;
        contactPerson: string | null;
    }>;
    remove(id: string, businessId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string | null;
        businessId: string;
        address: string | null;
        phone: string | null;
        category: string | null;
        isActive: boolean;
        contactPerson: string | null;
    }>;
}
