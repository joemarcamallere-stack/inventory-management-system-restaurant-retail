import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
