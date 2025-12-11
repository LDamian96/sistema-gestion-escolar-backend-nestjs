import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditAction } from '../../../generated/prisma';

// Rutas que requieren auditoría (operaciones sensibles)
const AUDITED_ROUTES = [
  // Operaciones de notas
  { path: /\/grades/, methods: ['POST', 'PATCH', 'DELETE'] },
  // Operaciones de pagos
  { path: /\/payments/, methods: ['POST', 'PATCH', 'DELETE'] },
  // Operaciones de usuarios
  { path: /\/students/, methods: ['POST', 'PATCH', 'DELETE'] },
  { path: /\/teachers/, methods: ['POST', 'PATCH', 'DELETE'] },
  { path: /\/parents/, methods: ['POST', 'PATCH', 'DELETE'] },
  // Operaciones de matrículas
  { path: /\/enrollments/, methods: ['POST', 'DELETE'] },
  // Operaciones de asistencia
  { path: /\/attendance/, methods: ['POST', 'PATCH'] },
  // Configuración de cursos
  { path: /\/courses/, methods: ['POST', 'PATCH', 'DELETE'] },
  // Autenticación
  { path: /\/auth\/login/, methods: ['POST'] },
  { path: /\/auth\/register/, methods: ['POST'] },
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDIT');

  constructor(
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;
    const now = Date.now();

    // Verificar si la ruta requiere auditoría
    const shouldAudit = this.shouldAuditRoute(url, method);
    if (!shouldAudit) {
      return next.handle();
    }

    // Extraer información del usuario
    const userId = user?.sub || null;
    const userEmail = user?.email || 'anonymous';
    const userRole = user?.role || 'unknown';
    const schoolId = user?.schoolId || null;

    // Extraer resource ID de la URL si existe
    const resourceId = this.extractResourceId(url);
    const resource = this.extractResource(url);
    const action = this.getAction(method, url);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;

          // Log a consola
          this.logger.log(
            `[${action}] ${resource}${resourceId ? `/${resourceId}` : ''} by ${userEmail} (${userRole}) - SUCCESS - ${duration}ms`
          );

          // Guardar en base de datos
          this.auditService.create({
            userId,
            userEmail,
            userRole,
            schoolId,
            action,
            resource,
            resourceId,
            method,
            path: url,
            ip: ip || headers['x-forwarded-for'] || null,
            userAgent: headers['user-agent'] || null,
            statusCode: 200,
            duration,
            success: true,
          });
        },
        error: (error) => {
          const duration = Date.now() - now;

          // Log a consola
          this.logger.warn(
            `[${action}] ${resource}${resourceId ? `/${resourceId}` : ''} by ${userEmail} (${userRole}) - FAILED - ${duration}ms - ${error.message}`
          );

          // Guardar en base de datos
          this.auditService.create({
            userId,
            userEmail,
            userRole,
            schoolId,
            action,
            resource,
            resourceId,
            method,
            path: url,
            ip: ip || headers['x-forwarded-for'] || null,
            userAgent: headers['user-agent'] || null,
            statusCode: error.status || 500,
            duration,
            success: false,
            errorMessage: error.message,
          });
        },
      }),
    );
  }

  private shouldAuditRoute(url: string, method: string): boolean {
    return AUDITED_ROUTES.some(
      (route) => route.path.test(url) && route.methods.includes(method),
    );
  }

  private extractResourceId(url: string): string | undefined {
    // Buscar UUID en la URL
    const uuidMatch = url.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    return uuidMatch ? uuidMatch[0] : undefined;
  }

  private extractResource(url: string): string {
    // Extraer el primer segmento después de /api/
    const match = url.match(/\/api\/([^\/\?]+)/);
    return match ? match[1] : 'unknown';
  }

  private getAction(method: string, url: string): AuditAction {
    // Caso especial para login
    if (url.includes('/auth/login')) {
      return AuditAction.LOGIN;
    }

    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PATCH':
      case 'PUT':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.CREATE;
    }
  }
}
