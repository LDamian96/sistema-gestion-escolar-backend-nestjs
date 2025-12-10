import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Dashboard general
  async getDashboard(schoolId: string) {
    const [
      totalStudents,
      totalTeachers,
      totalParents,
      activeCourses,
      pendingPayments,
      studentsByGender,
      recentEnrollments,
    ] = await Promise.all([
      this.prisma.student.count({ where: { schoolId } }),
      this.prisma.teacher.count({ where: { schoolId } }),
      this.prisma.parent.count({ where: { schoolId } }),
      this.prisma.course.count({
        where: { classroom: { section: { gradeLevel: { level: { schoolId } } } } },
      }),
      this.prisma.payment.count({
        where: { schoolId, status: 'PENDING' },
      }),
      this.prisma.student.groupBy({
        by: ['gender'],
        where: { schoolId },
        _count: true,
      }),
      this.prisma.enrollment.findMany({
        where: { student: { schoolId } },
        take: 10,
        orderBy: { enrollDate: 'desc' },
        include: { student: true, classroom: true },
      }),
    ]);

    return {
      totals: {
        students: totalStudents,
        teachers: totalTeachers,
        parents: totalParents,
        courses: activeCourses,
        pendingPayments,
      },
      demographics: {
        studentsByGender: studentsByGender.map((g) => ({
          gender: g.gender,
          count: g._count,
        })),
      },
      recent: {
        enrollments: recentEnrollments,
      },
    };
  }

  // Estadísticas de asistencia
  async getAttendanceStats(schoolId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      student: { schoolId },
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const attendances = await this.prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    return attendances.map((a) => ({
      status: a.status,
      count: a._count,
    }));
  }

  // Top estudiantes por notas
  async getTopStudents(schoolId: string, limit: number = 10) {
    const students = await this.prisma.student.findMany({
      where: { schoolId },
      include: {
        grades: {
          select: { score: true },
        },
      },
    });

    const studentsWithAverage = students
      .map((student) => {
        const totalScore = student.grades.reduce((sum, g) => sum + g.score, 0);
        const average = student.grades.length > 0 ? totalScore / student.grades.length : 0;

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          enrollmentCode: student.enrollmentCode,
          average: Math.round(average * 100) / 100,
          gradesCount: student.grades.length,
        };
      })
      .sort((a, b) => b.average - a.average)
      .slice(0, limit);

    return studentsWithAverage;
  }

  // Estadísticas de pagos
  async getPaymentStats(schoolId: string) {
    const [totalAmount, byStatus, overdue] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { schoolId },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        where: { schoolId },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: {
          schoolId,
          status: 'OVERDUE',
        },
      }),
    ]);

    return {
      total: totalAmount._sum.amount || 0,
      overdue,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        amount: s._sum.amount || 0,
      })),
    };
  }

  // Reporte de cursos
  async getCoursesReport(schoolId: string) {
    const courses = await this.prisma.course.findMany({
      where: {
        classroom: {
          section: {
            gradeLevel: {
              level: { schoolId },
            },
          },
        },
      },
      include: {
        subject: true,
        teacher: true,
        classroom: {
          include: {
            section: {
              include: {
                gradeLevel: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendances: true,
            tasks: true,
            grades: true,
          },
        },
      },
    });

    return courses;
  }
}
