import { Controller, Post, Body, UseGuards, Get, Res, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // Configuración de cookies seguras
  private getCookieOptions(maxAge: number) {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true, // No accesible desde JavaScript
      secure: isProduction, // Solo HTTPS en producción
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      maxAge,
      path: '/',
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión - Establece cookies HTTP-Only' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Establecer cookies HTTP-Only
    // Access token: 15 minutos
    res.cookie('access_token', result.accessToken, this.getCookieOptions(15 * 60 * 1000));

    // Refresh token: 7 días
    res.cookie('refresh_token', result.refreshToken, this.getCookieOptions(7 * 24 * 60 * 60 * 1000));

    // Devolver datos del usuario (sin tokens en el body para mayor seguridad)
    return {
      message: 'Login exitoso',
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar access token usando cookie' })
  @ApiResponse({ status: 200, description: 'Tokens refrescados exitosamente' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Obtener refresh token de la cookie
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      res.status(401);
      return { message: 'No hay refresh token' };
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    // Establecer nuevas cookies
    res.cookie('access_token', tokens.accessToken, this.getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', tokens.refreshToken, this.getCookieOptions(7 * 24 * 60 * 60 * 1000));

    return { message: 'Tokens refrescados exitosamente' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cerrar sesión - Elimina cookies' })
  @ApiResponse({ status: 200, description: 'Logout exitoso' })
  async logout(
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Obtener refresh token de la cookie para eliminarlo de la DB
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      await this.authService.logout(userId, refreshToken);
    }

    // Limpiar cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return { message: 'Logout exitoso' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener información del usuario actual' })
  @ApiResponse({ status: 200, description: 'Información del usuario' })
  async getMe(@CurrentUser() user: any) {
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    };
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verificar si el usuario está autenticado' })
  @ApiResponse({ status: 200, description: 'Usuario autenticado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async checkAuth(@CurrentUser() user: any) {
    return {
      authenticated: true,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
    };
  }
}
