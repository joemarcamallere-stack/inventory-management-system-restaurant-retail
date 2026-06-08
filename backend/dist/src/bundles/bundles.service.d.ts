import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
export declare class BundlesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private readonly bundleInclude;
    create(dto: CreateBundleDto, businessId: string, createdById: string, role: string): Promise<any>;
    findAll(businessId: string, status?: string, page?: number, limit?: number): Promise<PaginatedResult<any>>;
    findOne(id: string, businessId: string): Promise<any>;
    update(id: string, dto: UpdateBundleDto, businessId: string): Promise<any>;
    approve(id: string, businessId: string, approvedById: string, role: string): Promise<any>;
    reject(id: string, rejectionReason: string, businessId: string, role: string): Promise<any>;
    activate(id: string, businessId: string, role: string): Promise<any>;
    deactivate(id: string, businessId: string, role: string): Promise<any>;
    remove(id: string, businessId: string, role: string): Promise<void>;
}
