import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGradeDto, UpdateGradeDto } from './dto/create-grade.dto';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateGradeDto) {
    // Calcular letra automáticamente si no se proporciona
    const letterGrade = data.letterGrade || this.calculateLetterGrade(data.score);

    return this.prisma.grade.create({
      data: {
        ...data,
        letterGrade,
      },
      include: {
        student: { select: { firstName: true, lastName: true, enrollmentCode: true } },
        course: { include: { subject: true } },
        period: true,
      },
    });
  }

  async findAll(courseId?: string, studentId?: string, periodId?: string) {
    return this.prisma.grade.findMany({
      where: {
        ...(courseId && { courseId }),
        ...(studentId && { studentId }),
        ...(periodId && { periodId }),
      },
      include: {
        student: { select: { firstName: true, lastName: true, enrollmentCode: true } },
        course: { include: { subject: true } },
        period: true,
      },
      orderBy: [{ student: { lastName: 'asc' } }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    return this.prisma.grade.findUnique({
      where: { id },
      include: {
        student: { select: { firstName: true, lastName: true, enrollmentCode: true } },
        course: { include: { subject: true, teacher: true } },
        period: true,
      },
    });
  }

  async update(id: string, data: UpdateGradeDto) {
    // Recalcular letra si se cambia el score
    const updateData: any = { ...data };
    if (data.score !== undefined && !data.letterGrade) {
      updateData.letterGrade = this.calculateLetterGrade(data.score);
    }

    return this.prisma.grade.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.prisma.grade.delete({ where: { id } });
    return { message: 'Nota eliminada' };
  }

  // Calcular promedio de un estudiante en un curso
  async getStudentCourseAverage(studentId: string, courseId: string, periodId?: string) {
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

  // Obtener libreta de notas de un estudiante (todos los cursos de un periodo)
  async getStudentReportCard(studentId: string, periodId: string) {
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
    const overallAverage = reportCard.length > 0
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

  // Subir libreta de notas desde Excel (simulado)
  async uploadReportCard(studentId: string, periodId: string, excelData: any[]) {
    // excelData: [{ courseId, score, observation }]
    const grades = await Promise.all(
      excelData.map((data) =>
        this.create({
          studentId,
          periodId,
          courseId: data.courseId,
          score: data.score,
          observation: data.observation,
        }),
      ),
    );

    return {
      message: `${grades.length} notas cargadas exitosamente`,
      grades,
    };
  }

  // Obtener estadísticas de notas de un curso
  async getCourseStats(courseId: string, periodId?: string) {
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

  // Convertir nota numérica a letra según escala peruana
  private calculateLetterGrade(score: number): string {
    if (score >= 18) return 'AD'; // Logro destacado
    if (score >= 14) return 'A';  // Logro esperado
    if (score >= 11) return 'B';  // En proceso
    return 'C';                   // En inicio
  }
}
