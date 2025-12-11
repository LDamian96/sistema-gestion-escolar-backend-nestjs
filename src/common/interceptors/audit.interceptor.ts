import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface AuditLog {
  timestamp: Date;
  userId: string;
  userEmail: string;
  userRole: string;
  schoolId: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  statusCode?: number;
  duration: number;
  success: boolean;
  errorMessage?: string;
}

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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip, headers } = request;
    const now = Date.now();

    // Verificar si la ruta requiere auditoría
    const shouldAudit = this.shouldAuditRoute(url, method);
    if (!shouldAudit) {
      return next.handle();
    }

    // Extraer información del usuario
    const userId = user?.sub || 'anonymous';
    const userEmail = user?.email || 'unknown';
    const userRole = user?.role || 'unknown';
    const schoolId = user?.schoolId || 'unknown';

    // Extraer resource ID de la URL si existe
    const resourceId = this.extractResourceId(url);
    const resource = this.extractResource(url);
    const action = this.getAction(method);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          const auditLog: AuditLog = {
            timestamp: new Date(),
            userId,
            userEmail,
            userRole,
            schoolId,
            action,
            resource,
            resourceId,
            method,
            path: url,
            ip: ip || headers['x-forwarded-for'] || 'unknown',
            userAgent: headers['user-agent'] || 'unknown',
            statusCode: 200,
            duration,
            success: true,
          };

          this.logAudit(auditLog);
        },
        error: (error) => {
          const duration = Date.now() - now;
          const auditLog: AuditLog = {
            timestamp: new Date(),
            userId,
            userEmail,
            userRole,
            schoolId,
            action,
            resource,
            resourceId,
            method,
            path: url,
            ip: ip || headers['x-forwarded-for'] || 'unknown',
            userAgent: headers['user-agent'] || 'unknown',
            statusCode: error.status || 500,
            duration,
            success: false,
            errorMessage: error.message,
          };

          this.logAudit(auditLog);
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

  private getAction(method: string): string {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PATCH':
      case 'PUT':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return method;
    }
  }

  private logAudit(auditLog: AuditLog): void {
    const logMessage = `[${auditLog.action}] ${auditLog.resource}${auditLog.resourceId ? `/${auditLog.resourceId}` : ''} by ${auditLog.userEmail} (${auditLog.userRole}) - ${auditLog.success ? 'SUCCESS' : 'FAILED'} - ${auditLog.duration}ms`;

    if (auditLog.success) {
      this.logger.log(logMessage);
    } else {
      this.logger.warn(`${logMessage} - Error: ${auditLog.errorMessage}`);
    }

    // En producción, aquí se podría guardar en BD o enviar a un servicio de logs
    // await this.prisma.auditLog.create({ data: auditLog });
  }
}
