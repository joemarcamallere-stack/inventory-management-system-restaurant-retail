import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto, businessId: string): Promise<Omit<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        passwordHash: string;
        role: string;
        status: string;
        businessId: string;
        lastLogin: Date;
    }, "passwordHash">>;
    findAll(businessId: string, page?: number, limit?: number): Promise<PaginatedResult<any>>;
    findOne(id: string, businessId: string): Promise<Omit<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        passwordHash: string;
        role: string;
        status: string;
        businessId: string;
        lastLogin: Date;
    }, "passwordHash">>;
    findByEmail(email: string): Promise<({
        business: {
            id: string;
            name: string;
            modules: import("@prisma/client").$Enums.BusinessModule[];
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        passwordHash: string;
        role: string;
        status: string;
        businessId: string;
        lastLogin: Date;
    }) | null>;
    update(id: string, updateUserDto: UpdateUserDto, businessId: string): Promise<Omit<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        passwordHash: string;
        role: string;
        status: string;
        businessId: string;
        lastLogin: Date;
    }, "passwordHash">>;
    remove(id: string, businessId: string): Promise<Omit<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        passwordHash: string;
        role: string;
        status: string;
        businessId: string;
        lastLogin: Date;
    }, "passwordHash">>;
    touchLastLogin(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        passwordHash: string;
        role: string;
        status: string;
        businessId: string;
        lastLogin: Date;
    }>;
    sanitizeUser<T extends {
        passwordHash?: string;
    }>(user: T): Omit<T, "passwordHash">;
}
