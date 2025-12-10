import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceStatus } from '../../../generated/prisma';

export interface CreateAttendanceDto {
  courseId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateAttendanceDto) {
    return this.prisma.attendance.create({
      data: {
        ...data,
        date: new Date(data.date),
      },
      include: {
        student: { select: { firstName: true, lastName: true, enrollmentCode: true } },
        course: { include: { subject: true } },
      },
    });
  }

  async findAll(courseId?: string, studentId?: string, date?: string) {
    return this.prisma.attendance.findMany({
      where: {
        ...(courseId && { courseId }),
        ...(studentId && { studentId }),
        ...(date && { date: new Date(date) }),
      },
      include: {
        student: { select: { firstName: true, lastName: true, enrollmentCode: true } },
        course: { include: { subject: true, classroom: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async update(id: string, status: AttendanceStatus, notes?: string) {
    return this.prisma.attendance.update({
      where: { id },
      data: { status, notes },
    });
  }

  async remove(id: string) {
    await this.prisma.attendance.delete({ where: { id } });
    return { message: 'Asistencia eliminada' };
  }

  // Marcar asistencia para todos los estudiantes de un curso
  async markAllStudents(courseId: string, date: string, status: AttendanceStatus) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        classroom: {
          include: {
            enrollments: { select: { studentId: true } },
          },
        },
      },
    });

    if (!course) {
      throw new Error('Curso no encontrado');
    }

    const attendances = await Promise.all(
      course.classroom.enrollments.map((enrollment) =>
        this.prisma.attendance.upsert({
          where: {
            courseId_studentId_date: {
              courseId,
              studentId: enrollment.studentId,
              date: new Date(date),
            },
          },
          create: {
            courseId,
            studentId: enrollment.studentId,
            date: new Date(date),
            status,
          },
          update: { status },
        }),
      ),
    );

    return { message: `Asistencia marcada para ${attendances.length} estudiantes`, attendances };
  }

  // Obtener resumen de asistencia por estudiante
  async getStudentSummary(studentId: string, courseId?: string) {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        studentId,
        ...(courseId && { courseId }),
      },
    });

    const summary = attendances.reduce(
      (acc, att) => {
        acc.total++;
        acc.byStatus[att.status] = (acc.byStatus[att.status] || 0) + 1;
        return acc;
      },
      { total: 0, byStatus: {} as Record<string, number> },
    );

    return {
      studentId,
      ...summary,
      percentage: {
        present: summary.total > 0 ? ((summary.byStatus.PRESENT || 0) / summary.total) * 100 : 0,
      },
    };
  }
}
