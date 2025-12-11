import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction } from '../../../generated/prisma';

export interface CreateAuditLogDto {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  schoolId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
  duration?: number;
  success?: boolean;
  errorMessage?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(private prisma: PrismaService) {}

  async create(data: CreateAuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          userEmail: data.userEmail,
          userRole: data.userRole,
          schoolId: data.schoolId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          method: data.method,
          path: data.path,
          ip: data.ip,
          userAgent: data.userAgent,
          statusCode: data.statusCode,
          duration: data.duration,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      // No fallar la request original si la auditoría falla
      this.logger.error(`Error saving audit log: ${error.message}`);
    }
  }

  async findAll(
    schoolId: string,
    options: {
      page?: number;
      limit?: number;
      action?: AuditAction;
      resource?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const { page = 1, limit = 50, action, resource, userId, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByResource(resource: string, resourceId: string) {
    return this.prisma.auditLog.findMany({
      where: { resource, resourceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(schoolId: string, startDate?: Date, endDate?: Date) {
    const where: any = { schoolId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [byAction, byResource, totalSuccess, totalFailed] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: true,
      }),
      this.prisma.auditLog.count({ where: { ...where, success: true } }),
      this.prisma.auditLog.count({ where: { ...where, success: false } }),
    ]);

    return {
      byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
      byResource: byResource.map((r) => ({ resource: r.resource, count: r._count })),
      total: totalSuccess + totalFailed,
      success: totalSuccess,
      failed: totalFailed,
    };
  }
}
