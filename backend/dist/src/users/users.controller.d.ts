import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto, currentUser: AuthenticatedUser): Promise<Omit<{
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
    findAll(currentUser: AuthenticatedUser): Promise<Omit<{
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
    }, "passwordHash">[]>;
    findOne(id: string, currentUser: AuthenticatedUser): Promise<Omit<{
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
    update(id: string, updateUserDto: UpdateUserDto, currentUser: AuthenticatedUser): Promise<Omit<{
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
    remove(id: string, currentUser: AuthenticatedUser): Promise<Omit<{
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
}
