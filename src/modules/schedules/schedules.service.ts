import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateScheduleDto) {
    // Verificar que el curso existe
    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId },
    });

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    // Verificar conflictos de horario del profesor
    const conflicts = await this.prisma.schedule.findMany({
      where: {
        course: { teacherId: course.teacherId },
        dayOfWeek: data.dayOfWeek,
        OR: [
          {
            AND: [
              { startTime: { lte: data.startTime } },
              { endTime: { gt: data.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: data.endTime } },
              { endTime: { gte: data.endTime } },
            ],
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      throw new BadRequestException('El profesor ya tiene un horario en ese rango');
    }

    return this.prisma.schedule.create({
      data,
      include: {
        course: {
          include: {
            subject: true,
            teacher: { select: { firstName: true, lastName: true } },
            classroom: {
              include: {
                section: {
                  include: {
                    gradeLevel: { include: { level: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findAll(courseId?: string, teacherId?: string, classroomId?: string) {
    return this.prisma.schedule.findMany({
      where: {
        ...(courseId && { courseId }),
        ...(teacherId && { course: { teacherId } }),
        ...(classroomId && { course: { classroomId } }),
      },
      include: {
        course: {
          include: {
            subject: true,
            teacher: { select: { firstName: true, lastName: true } },
            classroom: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            subject: true,
            teacher: true,
            classroom: {
              include: {
                section: {
                  include: {
                    gradeLevel: { include: { level: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }

    return schedule;
  }

  async update(id: string, data: UpdateScheduleDto) {
    await this.findOne(id);

    return this.prisma.schedule.update({
      where: { id },
      data,
      include: {
        course: {
          include: {
            subject: true,
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.schedule.delete({ where: { id } });
    return { message: 'Horario eliminado' };
  }

  // Obtener horario completo de un profesor
  async getTeacherSchedule(teacherId: string) {
    const schedules = await this.prisma.schedule.findMany({
      where: { course: { teacherId } },
      include: {
        course: {
          include: {
            subject: true,
            classroom: {
              include: {
                section: {
                  include: {
                    gradeLevel: { include: { level: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Agrupar por día
    const groupedByDay: Record<number, any[]> = {
      0: [], // Domingo
      1: [], // Lunes
      2: [], // Martes
      3: [], // Miércoles
      4: [], // Jueves
      5: [], // Viernes
      6: [], // Sábado
    };

    schedules.forEach((schedule) => {
      if (!groupedByDay[schedule.dayOfWeek]) {
        groupedByDay[schedule.dayOfWeek] = [];
      }
      groupedByDay[schedule.dayOfWeek].push(schedule);
    });

    return groupedByDay;
  }

  // Obtener horario completo de un estudiante
  async getStudentSchedule(studentId: string) {
    // Obtener matrículas del estudiante
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

    // Extraer todos los horarios
    const allSchedules: any[] = [];
    enrollments.forEach((enrollment) => {
      enrollment.classroom.courses.forEach((course) => {
        course.schedules.forEach((schedule) => {
          allSchedules.push({
            ...schedule,
            subject: course.subject,
            teacher: course.teacher,
          });
        });
      });
    });

    // Agrupar por día
    const groupedByDay: Record<number, any[]> = {
      0: [], // Domingo
      1: [], // Lunes
      2: [], // Martes
      3: [], // Miércoles
      4: [], // Jueves
      5: [], // Viernes
      6: [], // Sábado
    };

    allSchedules.forEach((schedule) => {
      if (!groupedByDay[schedule.dayOfWeek]) {
        groupedByDay[schedule.dayOfWeek] = [];
      }
      groupedByDay[schedule.dayOfWeek].push(schedule);
    });

    // Ordenar por hora de inicio
    Object.keys(groupedByDay).forEach((day) => {
      groupedByDay[Number(day)].sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    });

    return groupedByDay;
  }

  // Verificar disponibilidad de aula
  // NOTA: Este método necesita ser revisado ya que Schedule no tiene campo classroom
  async checkClassroomAvailability(
    classroom: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
  ) {
    // TODO: Implementar búsqueda de conflictos a través de Course->Classroom
    const conflicts = await this.prisma.schedule.findMany({
      where: {
        // classroom no existe en Schedule
        dayOfWeek,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
        ],
      },
      include: {
        course: {
          include: {
            subject: true,
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  }
}
