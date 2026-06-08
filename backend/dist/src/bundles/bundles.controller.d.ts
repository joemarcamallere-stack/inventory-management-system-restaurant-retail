import { BundlesService } from './bundles.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { RejectBundleDto } from './dto/reject-bundle.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
export declare class BundlesController {
    private readonly bundlesService;
    constructor(bundlesService: BundlesService);
    create(dto: CreateBundleDto, user: AuthenticatedUser): Promise<any>;
    findAll(user: AuthenticatedUser, status?: string, page?: string, limit?: string): Promise<import("../common/dto/pagination.dto").PaginatedResult<any>>;
    findOne(id: string, user: AuthenticatedUser): Promise<any>;
    update(id: string, dto: UpdateBundleDto, user: AuthenticatedUser): Promise<any>;
    approve(id: string, user: AuthenticatedUser): Promise<any>;
    reject(id: string, dto: RejectBundleDto, user: AuthenticatedUser): Promise<any>;
    activate(id: string, user: AuthenticatedUser): Promise<any>;
    deactivate(id: string, user: AuthenticatedUser): Promise<any>;
    remove(id: string, user: AuthenticatedUser): Promise<void>;
}
