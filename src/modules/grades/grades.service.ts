import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGradeDto, UpdateGradeDto } from './dto/create-grade.dto';
import { Role } from '../../../generated/prisma';

interface FindAllOptions {
  courseId?: string;
  studentId?: string;
  periodId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateGradeDto, schoolId: string) {
    // Validar que el estudiante pertenece a la escuela
    const student = await this.prisma.student.findFirst({
      where: { id: data.studentId, schoolId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Validar rango de score (0-20 para sistema peruano)
    if (data.score < 0 || data.score > 20) {
      throw new BadRequestException('La nota debe estar entre 0 y 20');
    }

    // Calcular letra automáticamente si no se proporciona
    const letterGrade = data.letterGrade || this.calculateLetterGrade(data.score);

    return this.prisma.grade.create({
      data: {
        ...data,
        letterGrade,
      },
      include: {
        student: {
          select: { firstName: true, lastName: true, enrollmentCode: true, schoolId: true },
        },
        course: { include: { subject: true } },
        period: true,
      },
    });
  }

  async findAll(schoolId: string, options: FindAllOptions = {}) {
    const { courseId, studentId, periodId, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      student: { schoolId }, // Multi-tenant via student
      ...(courseId && { courseId }),
      ...(studentId && { studentId }),
      ...(periodId && { periodId }),
    };

    const [grades, total] = await Promise.all([
      this.prisma.grade.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, enrollmentCode: true },
          },
          course: { include: { subject: true } },
          period: true,
        },
        orderBy: [{ student: { lastName: 'asc' } }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.grade.count({ where }),
    ]);

    return {
      data: grades,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string, schoolId: string, userId?: string, role?: Role) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollmentCode: true,
            schoolId: true,
            userId: true,
          },
        },
        course: { include: { subject: true, teacher: true } },
        period: true,
      },
    });

    if (!grade) {
      throw new NotFoundException('Nota no encontrada');
    }

    // Validar multi-tenant
    if (grade.student.schoolId !== schoolId) {
      throw new ForbiddenException('No tienes acceso a esta nota');
    }

    // Control de acceso por ownership
    if (role === Role.STUDENT && grade.student.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta nota');
    }

    // Si es padre, verificar que el estudiante es su hijo
    if (role === Role.PARENT) {
      const isParentOfStudent = await this.checkParentOwnership(userId, grade.studentId);
      if (!isParentOfStudent) {
        throw new ForbiddenException('No tienes permiso para ver esta nota');
      }
    }

    return grade;
  }

  async update(id: string, data: UpdateGradeDto, schoolId: string) {
    // Verificar existencia y pertenencia a la escuela
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { student: { select: { schoolId: true } } },
    });

    if (!grade) {
      throw new NotFoundException('Nota no encontrada');
    }

    if (grade.student.schoolId !== schoolId) {
      throw new ForbiddenException('No tienes acceso a esta nota');
    }

    // Validar rango si se actualiza score
    if (data.score !== undefined && (data.score < 0 || data.score > 20)) {
      throw new BadRequestException('La nota debe estar entre 0 y 20');
    }

    // Recalcular letra si se cambia el score
    const updateData: any = { ...data };
    if (data.score !== undefined && !data.letterGrade) {
      updateData.letterGrade = this.calculateLetterGrade(data.score);
    }

    return this.prisma.grade.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { firstName: true, lastName: true, enrollmentCode: true } },
        course: { include: { subject: true } },
        period: true,
      },
    });
  }

  async remove(id: string, schoolId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { id },
      include: { student: { select: { schoolId: true } } },
    });

    if (!grade) {
      throw new NotFoundException('Nota no encontrada');
    }

    if (grade.student.schoolId !== schoolId) {
      throw new ForbiddenException('No tienes acceso a esta nota');
    }

    await this.prisma.grade.delete({ where: { id } });
    return { message: 'Nota eliminada exitosamente' };
  }

  async getStudentCourseAverage(
    studentId: string,
    courseId: string,
    periodId: string | undefined,
    schoolId: string,
    userId?: string,
    role?: Role
  ) {
    // Validar acceso al estudiante
    await this.validateStudentAccess(studentId, schoolId, userId, role);

    const grades = await this.prisma.grade.findMany({
      where: {
        studentId,
        courseId,
        ...(periodId && { periodId }),
      },
    });

    if (grades.length === 0) {
      return {
        studentId,
        courseId,
        periodId,
        average: null,
        gradesCount: 0,
      };
    }

    const total = grades.reduce((sum, g) => sum + g.score, 0);
    const average = total / grades.length;

    return {
      studentId,
      courseId,
      periodId,
      average: Math.round(average * 100) / 100,
      letterGrade: this.calculateLetterGrade(average),
      gradesCount: grades.length,
    };
  }

  async getStudentReportCard(
    studentId: string,
    periodId: string,
    schoolId: string,
    userId?: string,
    role?: Role
  ) {
    // Validar acceso al estudiante
    await this.validateStudentAccess(studentId, schoolId, userId, role);

    const grades = await this.prisma.grade.findMany({
      where: { studentId, periodId },
      include: {
        course: { include: { subject: true } },
      },
    });

    // Agrupar por curso y calcular promedio
    const gradesByCourse = grades.reduce((acc, grade) => {
      const courseId = grade.courseId;
      if (!acc[courseId]) {
        acc[courseId] = {
          course: grade.course,
          grades: [],
          total: 0,
        };
      }
      acc[courseId].grades.push(grade);
      acc[courseId].total += grade.score;
      return acc;
    }, {} as Record<string, any>);

    const reportCard = Object.values(gradesByCourse).map((item: any) => ({
      course: item.course,
      grades: item.grades,
      average: Math.round((item.total / item.grades.length) * 100) / 100,
      letterGrade: this.calculateLetterGrade(item.total / item.grades.length),
    }));

    // Calcular promedio general
    const overallAverage =
      reportCard.length > 0
        ? reportCard.reduce((sum, item) => sum + item.average, 0) / reportCard.length
        : 0;

    return {
      studentId,
      periodId,
      reportCard,
      overallAverage: Math.round(overallAverage * 100) / 100,
      overallLetterGrade: this.calculateLetterGrade(overallAverage),
    };
  }

  async uploadReportCard(
    studentId: string,
    periodId: string,
    excelData: any[],
    schoolId: string
  ) {
    // Validar que el estudiante pertenece a la escuela
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Validar datos de Excel
    if (!Array.isArray(excelData) || excelData.length === 0) {
      throw new BadRequestException('Datos de notas inválidos');
    }

    const grades = await Promise.all(
      excelData.map((data) =>
        this.create(
          {
            studentId,
            periodId,
            courseId: data.courseId,
            score: data.score,
            observation: data.observation,
          },
          schoolId
        ),
      ),
    );

    return {
      message: `${grades.length} notas cargadas exitosamente`,
      grades,
    };
  }

  async getCourseStats(courseId: string, periodId: string | undefined, schoolId: string) {
    // Verificar que el curso pertenece a la escuela
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        classroom: {
          section: {
            gradeLevel: {
              level: { schoolId },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    const grades = await this.prisma.grade.findMany({
      where: {
        courseId,
        ...(periodId && { periodId }),
      },
    });

    if (grades.length === 0) {
      return {
        courseId,
        periodId,
        count: 0,
        average: null,
        max: null,
        min: null,
      };
    }

    const scores = grades.map((g) => g.score);
    const total = scores.reduce((sum, score) => sum + score, 0);
    const average = total / scores.length;

    return {
      courseId,
      periodId,
      count: grades.length,
      average: Math.round(average * 100) / 100,
      max: Math.max(...scores),
      min: Math.min(...scores),
      letterGrade: this.calculateLetterGrade(average),
    };
  }

  // Validar acceso a datos de un estudiante
  private async validateStudentAccess(
    studentId: string,
    schoolId: string,
    userId?: string,
    role?: Role
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, userId: true, schoolId: true },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Si es estudiante, solo puede ver sus propios datos
    if (role === Role.STUDENT && student.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver estos datos');
    }

    // Si es padre, verificar que es padre del estudiante
    if (role === Role.PARENT) {
      const isParent = await this.checkParentOwnership(userId, studentId);
      if (!isParent) {
        throw new ForbiddenException('No tienes permiso para ver estos datos');
      }
    }

    return student;
  }

  // Verificar si un usuario es padre de un estudiante
  private async checkParentOwnership(userId: string, studentId: string): Promise<boolean> {
    const parent = await this.prisma.parent.findFirst({
      where: { userId },
      include: {
        students: {
          where: { studentId },
        },
      },
    });

    return parent?.students?.length > 0;
  }

  // Convertir nota numérica a letra según escala peruana
  private calculateLetterGrade(score: number): string {
    if (score >= 18) return 'AD'; // Logro destacado
    if (score >= 14) return 'A'; // Logro esperado
    if (score >= 11) return 'B'; // En proceso
    return 'C'; // En inicio
  }
}
