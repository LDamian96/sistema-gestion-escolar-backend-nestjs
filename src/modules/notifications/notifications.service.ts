import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationType, NotificationChannel } from '../../../generated/prisma';

export interface CreateNotificationDto {
  userId: string;
  schoolId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
  data?: any;
}

export interface NotifyManyDto {
  userIds: string[];
  schoolId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Crear una notificación para un usuario
  async create(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        schoolId: data.schoolId,
        type: data.type,
        channel: data.channel || NotificationChannel.SYSTEM,
        title: data.title,
        message: data.message,
        data: data.data,
      },
    });
  }

  // Crear notificaciones para múltiples usuarios
  async notifyMany(data: NotifyManyDto) {
    const notifications = data.userIds.map((userId) => ({
      userId,
      schoolId: data.schoolId,
      type: data.type,
      channel: data.channel || NotificationChannel.SYSTEM,
      title: data.title,
      message: data.message,
      data: data.data,
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  // Obtener notificaciones de un usuario
  async findAllForUser(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Marcar una notificación como leída
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Marcar todas como leídas
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { message: 'Todas las notificaciones marcadas como leídas' };
  }

  // Eliminar una notificación
  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notificación eliminada' };
  }

  // Eliminar todas las notificaciones leídas de un usuario
  async removeAllRead(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });

    return { message: 'Notificaciones leídas eliminadas' };
  }

  // === MÉTODOS HELPER PARA CREAR NOTIFICACIONES ESPECÍFICAS ===

  // Notificar cuando se publica una nota
  async notifyGradePosted(studentUserId: string, schoolId: string, courseName: string, score: number) {
    return this.create({
      userId: studentUserId,
      schoolId,
      type: NotificationType.GRADE_POSTED,
      title: 'Nueva nota publicada',
      message: `Se ha publicado tu nota de ${courseName}: ${score}`,
      data: { courseName, score },
    });
  }

  // Notificar cuando se asigna una tarea
  async notifyTaskAssigned(studentUserId: string, schoolId: string, taskTitle: string, dueDate?: Date) {
    const dueDateStr = dueDate ? ` - Fecha límite: ${dueDate.toLocaleDateString()}` : '';
    return this.create({
      userId: studentUserId,
      schoolId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'Nueva tarea asignada',
      message: `Se te ha asignado: "${taskTitle}"${dueDateStr}`,
      data: { taskTitle, dueDate },
    });
  }

  // Notificar alerta de asistencia (a padres)
  async notifyAttendanceAlert(parentUserId: string, schoolId: string, studentName: string, status: string, date: Date) {
    return this.create({
      userId: parentUserId,
      schoolId,
      type: NotificationType.ATTENDANCE_ALERT,
      title: 'Alerta de asistencia',
      message: `${studentName} fue marcado como "${status}" el ${date.toLocaleDateString()}`,
      data: { studentName, status, date },
    });
  }

  // Notificar pago pendiente
  async notifyPaymentDue(userId: string, schoolId: string, description: string, amount: number, dueDate: Date) {
    return this.create({
      userId,
      schoolId,
      type: NotificationType.PAYMENT_DUE,
      title: 'Pago pendiente',
      message: `Tienes un pago pendiente: ${description} - S/. ${amount.toFixed(2)} - Vence: ${dueDate.toLocaleDateString()}`,
      data: { description, amount, dueDate },
    });
  }

  // Anuncio general para toda la escuela
  async broadcastAnnouncement(schoolId: string, title: string, message: string) {
    // Obtener todos los usuarios activos de la escuela
    const users = await this.prisma.user.findMany({
      where: { schoolId, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (users.length === 0) return { count: 0 };

    return this.notifyMany({
      userIds: users.map((u) => u.id),
      schoolId,
      type: NotificationType.ANNOUNCEMENT,
      title,
      message,
    });
  }
}
