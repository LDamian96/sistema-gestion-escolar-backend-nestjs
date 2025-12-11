import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      // Extraer JWT de cookie HTTP-Only O del header Authorization
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Primero intentar cookie (para navegadores)
        (request: Request) => {
          const token = request?.cookies?.access_token;
          if (token) {
            return token;
          }
          return null;
        },
        // Fallback a Bearer token (para Swagger, Postman, mobile apps)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret') || process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // payload contiene: { sub: userId, email, role, schoolId }
    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    // Este objeto se adjunta a req.user en los controllers
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      schoolId: payload.schoolId,
    };
  }
}
