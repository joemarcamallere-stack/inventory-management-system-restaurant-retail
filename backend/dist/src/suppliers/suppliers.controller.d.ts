import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    create(dto: CreateSupplierDto, user: AuthenticatedUser): Promise<{
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
    findAll(user: AuthenticatedUser, isActive?: string, page?: string, limit?: string): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findOne(id: string, user: AuthenticatedUser): Promise<{
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
    update(id: string, dto: UpdateSupplierDto, user: AuthenticatedUser): Promise<{
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
    remove(id: string, user: AuthenticatedUser): Promise<{
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
