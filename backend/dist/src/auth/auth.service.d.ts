import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: {
            modules: import("@prisma/client").$Enums.BusinessModule[];
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            role: string;
            status: string;
            businessId: string;
            lastLogin: Date;
        };
    }>;
}
