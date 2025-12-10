import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(createCourseDto: CreateCourseDto) {
    return this.prisma.course.create({
      data: createCourseDto,
      include: {
        subject: true,
        teacher: true,
        classroom: { include: { section: { include: { gradeLevel: true } } } },
        academicYear: true,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.course.findMany({
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
        schedules: true,
        _count: {
          select: {
            attendances: true,
            tasks: true,
            grades: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
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
            enrollments: {
              include: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    enrollmentCode: true,
                  },
                },
              },
            },
          },
        },
        schedules: true,
        tasks: { orderBy: { dueDate: 'desc' }, take: 10 },
      },
    });

    if (!course) throw new NotFoundException('Curso no encontrado');
    return course;
  }

  async update(id: string, data: Partial<CreateCourseDto>) {
    return this.prisma.course.update({
      where: { id },
      data,
      include: {
        subject: true,
        teacher: true,
        classroom: true,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.course.delete({ where: { id } });
    return { message: 'Curso eliminado' };
  }

  async getStudentsByCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        classroom: {
          include: {
            enrollments: {
              include: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    enrollmentCode: true,
                    gender: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Curso no encontrado');

    return course.classroom.enrollments.map((e) => e.student);
  }
}
