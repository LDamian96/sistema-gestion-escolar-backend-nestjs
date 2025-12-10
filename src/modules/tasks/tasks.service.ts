import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { CreateSubmissionDto, GradeSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateTaskDto) {
    // Validar tarea/examen duplicado (mismo título en mismo curso)
    const existing = await this.prisma.task.findFirst({
      where: {
        courseId: data.courseId,
        title: data.title,
      },
    });

    if (existing) {
      throw new BadRequestException(`Ya existe una tarea/examen con el título "${data.title}" en este curso`);
    }

    return this.prisma.task.create({
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
      },
      include: {
        course: {
          include: {
            subject: true,
            teacher: true,
          },
        },
      },
    });
  }

  async findAll(courseId?: string, type?: string) {
    return this.prisma.task.findMany({
      where: {
        ...(courseId && { courseId }),
        ...(type && { type: type as any }),
      },
      include: {
        course: {
          include: {
            subject: true,
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            subject: true,
            teacher: true,
          },
        },
        submissions: {
          include: {
            student: { select: { firstName: true, lastName: true, enrollmentCode: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });
  }

  async update(id: string, data: UpdateTaskDto) {
    return this.prisma.task.update({
      where: { id },
      data: {
        ...data,
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.task.delete({ where: { id } });
    return { message: 'Tarea eliminada' };
  }

  // Envío de tareas por estudiantes
  async submitTask(data: CreateSubmissionDto) {
    return this.prisma.taskSubmission.create({
      data: {
        ...data,
        submittedAt: new Date(),
      },
      include: {
        task: true,
        student: { select: { firstName: true, lastName: true, enrollmentCode: true } },
      },
    });
  }

  // Calificar envío
  async gradeSubmission(submissionId: string, data: GradeSubmissionDto) {
    return this.prisma.taskSubmission.update({
      where: { id: submissionId },
      data: {
        grade: parseFloat(data.score),
        feedback: data.feedback,
        gradedAt: new Date(),
      },
      include: {
        task: true,
        student: { select: { firstName: true, lastName: true, enrollmentCode: true } },
      },
    });
  }

  // Obtener envíos de un estudiante
  async getStudentSubmissions(studentId: string, courseId?: string) {
    return this.prisma.taskSubmission.findMany({
      where: {
        studentId,
        ...(courseId && { task: { courseId } }),
      },
      include: {
        task: {
          include: {
            course: { include: { subject: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // Obtener tareas pendientes de un estudiante
  async getPendingTasks(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            classroom: {
              include: {
                courses: {
                  include: {
                    tasks: {
                      where: {
                        dueDate: { gte: new Date() },
                      },
                      include: {
                        submissions: {
                          where: { studentId },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const pendingTasks: any[] = [];
    student?.enrollments.forEach((enrollment) => {
      enrollment.classroom.courses.forEach((course) => {
        course.tasks.forEach((task) => {
          if (task.submissions.length === 0) {
            pendingTasks.push({
              ...task,
              courseInfo: {
                id: course.id,
                subjectId: course.subjectId,
              },
            });
          }
        });
      });
    });

    return pendingTasks;
  }
}
