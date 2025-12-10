import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateEnrollmentDto) {
    // Verificar que el estudiante no esté ya inscrito en este aula
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: data.studentId,
        classroomId: data.classroomId,
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('El estudiante ya está inscrito en esta aula');
    }

    // Crear matrícula
    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId: data.studentId,
        classroomId: data.classroomId,
        enrollDate: data.enrollDate ? new Date(data.enrollDate) : new Date(),
      },
      include: {
        student: true,
        classroom: {
          include: {
            section: {
              include: {
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    return enrollment;
  }

  async findAll(studentId?: string, classroomId?: string, schoolId?: string) {
    return this.prisma.enrollment.findMany({
      where: {
        ...(studentId && { studentId }),
        ...(classroomId && { classroomId }),
        ...(schoolId && { student: { schoolId } }),
      },
      include: {
        student: true,
        classroom: {
          include: {
            section: {
              include: {
                gradeLevel: true,
              },
            },
          },
        },
      },
      orderBy: { enrollDate: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: true,
        classroom: {
          include: {
            section: {
              include: {
                gradeLevel: true,
              },
            },
            courses: {
              include: {
                subject: true,
                teacher: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateEnrollmentDto) {
    return this.prisma.enrollment.update({
      where: { id },
      data: {
        ...(data.classroomId && { classroomId: data.classroomId }),
        ...(data.enrollDate && { enrollDate: new Date(data.enrollDate) }),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.enrollment.delete({ where: { id } });
    return { message: 'Matrícula eliminada' };
  }

  // Obtener cursos de un estudiante (basado en su matrícula)
  async getStudentCourses(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        classroom: {
          include: {
            courses: {
              include: {
                subject: true,
                teacher: { select: { firstName: true, lastName: true } },
                schedules: true,
              },
            },
          },
        },
      },
    });

    // Aplanar los cursos de todas las matrículas
    const courses = enrollments.flatMap((enrollment) => enrollment.classroom.courses);

    return courses;
  }

  // Transferir estudiante a otra aula
  async transferStudent(enrollmentId: string, newClassroomId: string) {
    const enrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { classroomId: newClassroomId },
      include: {
        student: true,
        classroom: {
          include: {
            section: {
              include: {
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    return {
      message: 'Estudiante transferido exitosamente',
      enrollment,
    };
  }

  // Inscribir múltiples estudiantes a un aula
  async bulkEnroll(classroomId: string, studentIds: string[]) {
    const enrollments = await Promise.all(
      studentIds.map((studentId) =>
        this.create({ studentId, classroomId }),
      ),
    );

    return {
      message: `${enrollments.length} estudiantes inscritos exitosamente`,
      enrollments,
    };
  }

  // Obtener estadísticas de matrícula
  async getEnrollmentStats(schoolId: string) {
    const [totalEnrollments, enrollmentsByGrade] = await Promise.all([
      this.prisma.enrollment.count({
        where: { student: { schoolId } },
      }),
      this.prisma.enrollment.groupBy({
        by: ['classroomId'],
        where: { student: { schoolId } },
        _count: true,
      }),
    ]);

    return {
      total: totalEnrollments,
      byClassroom: enrollmentsByGrade,
    };
  }
}
