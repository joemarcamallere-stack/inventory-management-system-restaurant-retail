import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getJwtSecret } from './jwt-secret';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Prefer HttpOnly cookie; fall back to Authorization header for API clients
    const cookieToken: string | undefined = request.cookies?.access_token;
    const authHeader: string | undefined = request.headers.authorization;
    const [type, bearerToken] = authHeader?.split(' ') ?? [];
    const token = cookieToken ?? (type === 'Bearer' ? bearerToken : undefined);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: getJwtSecret(this.configService),
      });
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        businessId: payload.businessId,
        modules: payload.modules ?? [],
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
