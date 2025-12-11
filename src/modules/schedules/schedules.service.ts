import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';

interface ConflictInfo {
  type: 'teacher' | 'classroom';
  schedule: any;
  message: string;
}

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateScheduleDto, schoolId?: string) {
    // Verificar que el curso existe
    const course = await this.prisma.course.findFirst({
      where: {
        id: data.courseId,
        ...(schoolId && { classroom: { section: { gradeLevel: { level: { schoolId } } } } }),
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classroom: { select: { id: true } },
      },
    });

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    // Validar formato de horas
    this.validateTimeFormat(data.startTime, data.endTime);

    // Verificar conflictos
    const conflicts = await this.checkConflicts(
      course.teacher.id,
      course.classroom.id,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
    );

    if (conflicts.length > 0) {
      const messages = conflicts.map(c => c.message).join('; ');
      throw new BadRequestException(`Conflicto de horario: ${messages}`);
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

  async findAll(schoolId?: string, courseId?: string, teacherId?: string, classroomId?: string) {
    return this.prisma.schedule.findMany({
      where: {
        ...(courseId && { courseId }),
        ...(teacherId && { course: { teacherId } }),
        ...(classroomId && { course: { classroomId } }),
        ...(schoolId && {
          course: {
            classroom: {
              section: {
                gradeLevel: {
                  level: { schoolId }
                }
              }
            }
          }
        }),
      },
      include: {
        course: {
          include: {
            subject: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
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
  }

  async findOne(id: string, schoolId?: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id,
        ...(schoolId && {
          course: {
            classroom: {
              section: {
                gradeLevel: {
                  level: { schoolId }
                }
              }
            }
          }
        }),
      },
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

  async update(id: string, data: UpdateScheduleDto, schoolId?: string) {
    const existing = await this.findOne(id, schoolId);

    // Si se actualizan horarios, validar conflictos
    if (data.dayOfWeek !== undefined || data.startTime || data.endTime) {
      const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
      const startTime = data.startTime ?? existing.startTime;
      const endTime = data.endTime ?? existing.endTime;

      // Validar formato de horas si se proporcionan
      if (data.startTime || data.endTime) {
        this.validateTimeFormat(startTime, endTime);
      }

      // Verificar conflictos excluyendo el horario actual
      const conflicts = await this.checkConflicts(
        existing.course.teacher.id,
        existing.course.classroom.id,
        dayOfWeek,
        startTime,
        endTime,
        id, // Excluir este horario
      );

      if (conflicts.length > 0) {
        const messages = conflicts.map(c => c.message).join('; ');
        throw new BadRequestException(`Conflicto de horario: ${messages}`);
      }
    }

    return this.prisma.schedule.update({
      where: { id },
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

  async remove(id: string, schoolId?: string) {
    await this.findOne(id, schoolId);
    await this.prisma.schedule.delete({ where: { id } });
    return { message: 'Horario eliminado exitosamente' };
  }

  // Verificar disponibilidad antes de crear (endpoint público)
  async checkAvailability(
    courseId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        classroom: { select: { id: true } },
      },
    });

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    this.validateTimeFormat(startTime, endTime);

    const conflicts = await this.checkConflicts(
      course.teacher.id,
      course.classroom.id,
      dayOfWeek,
      startTime,
      endTime,
    );

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.map(c => ({
        type: c.type,
        message: c.message,
        conflictingSchedule: {
          id: c.schedule.id,
          dayOfWeek: c.schedule.dayOfWeek,
          startTime: c.schedule.startTime,
          endTime: c.schedule.endTime,
          subject: c.schedule.course?.subject?.name,
        },
      })),
    };
  }

  // Obtener horario completo de un profesor
  async getTeacherSchedule(teacherId: string, schoolId?: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        ...(schoolId && { schoolId }),
      },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

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

    return this.groupByDay(schedules);
  }

  // Obtener horario completo de un estudiante
  async getStudentSchedule(studentId: string, schoolId?: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        ...(schoolId && { schoolId }),
      },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

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

    return this.groupByDay(allSchedules);
  }

  // Obtener horario completo de un salón/aula
  async getClassroomSchedule(classroomId: string, schoolId?: string) {
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        id: classroomId,
        ...(schoolId && {
          section: {
            gradeLevel: {
              level: { schoolId }
            }
          }
        }),
      },
    });

    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }

    const schedules = await this.prisma.schedule.findMany({
      where: { course: { classroomId } },
      include: {
        course: {
          include: {
            subject: true,
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return this.groupByDay(schedules);
  }

  // === MÉTODOS PRIVADOS ===

  // Validar formato y lógica de horas
  private validateTimeFormat(startTime: string, endTime: string) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(startTime)) {
      throw new BadRequestException('Formato de hora de inicio inválido. Use HH:MM');
    }

    if (!timeRegex.test(endTime)) {
      throw new BadRequestException('Formato de hora de fin inválido. Use HH:MM');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('La hora de inicio debe ser menor a la hora de fin');
    }

    // Validar horarios razonables (6:00 - 22:00)
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);

    if (startHour < 6 || endHour > 22) {
      throw new BadRequestException('Los horarios deben estar entre 06:00 y 22:00');
    }
  }

  // Verificar conflictos de horario
  private async checkConflicts(
    teacherId: string,
    classroomId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeScheduleId?: string,
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    // Conflicto de profesor: no puede estar en dos lugares al mismo tiempo
    const teacherConflicts = await this.prisma.schedule.findMany({
      where: {
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        course: { teacherId },
        dayOfWeek,
        // Overlap: startA < endB AND endA > startB
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: {
        course: {
          include: {
            subject: true,
            classroom: {
              include: {
                section: { include: { gradeLevel: true } },
              },
            },
          },
        },
      },
    });

    teacherConflicts.forEach(schedule => {
      conflicts.push({
        type: 'teacher',
        schedule,
        message: `El profesor ya tiene clase de ${schedule.course.subject.name} en ${schedule.course.classroom.section.gradeLevel.name} ${schedule.course.classroom.section.name} de ${schedule.startTime} a ${schedule.endTime}`,
      });
    });

    // Conflicto de aula: no puede haber dos clases en el mismo salón
    const classroomConflicts = await this.prisma.schedule.findMany({
      where: {
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        course: { classroomId },
        dayOfWeek,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
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

    classroomConflicts.forEach(schedule => {
      conflicts.push({
        type: 'classroom',
        schedule,
        message: `El aula ya tiene clase de ${schedule.course.subject.name} con ${schedule.course.teacher.firstName} ${schedule.course.teacher.lastName} de ${schedule.startTime} a ${schedule.endTime}`,
      });
    });

    return conflicts;
  }

  // Agrupar horarios por día de la semana
  private groupByDay(schedules: any[]): Record<number, any[]> {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const grouped: Record<number, any[]> = {
      1: [], // Lunes
      2: [], // Martes
      3: [], // Miércoles
      4: [], // Jueves
      5: [], // Viernes
      6: [], // Sábado
      0: [], // Domingo
    };

    schedules.forEach((schedule) => {
      if (grouped[schedule.dayOfWeek]) {
        grouped[schedule.dayOfWeek].push({
          ...schedule,
          dayName: days[schedule.dayOfWeek],
        });
      }
    });

    // Ordenar cada día por hora de inicio
    Object.keys(grouped).forEach((day) => {
      grouped[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return grouped;
  }
}
