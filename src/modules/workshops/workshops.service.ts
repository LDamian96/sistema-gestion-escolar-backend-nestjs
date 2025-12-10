import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkshopDto, UpdateWorkshopDto, EnrollStudentDto } from './dto/create-workshop.dto';

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateWorkshopDto) {
    return this.prisma.workshop.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.workshop.findMany({
      where: { schoolId },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.workshop.findUnique({
      where: { id },
      include: {
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
    });
  }

  async update(id: string, data: UpdateWorkshopDto) {
    return this.prisma.workshop.update({
      where: { id },
      data: {
        ...data,
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.workshop.delete({ where: { id } });
    return { message: 'Taller eliminado' };
  }

  // Inscribir estudiante en taller
  async enrollStudent(data: EnrollStudentDto) {
    // Verificar capacidad del taller
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: data.workshopId },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!workshop) {
      throw new BadRequestException('Taller no encontrado');
    }

    if (workshop.capacity && workshop._count.enrollments >= workshop.capacity) {
      throw new BadRequestException('El taller ha alcanzado su capacidad máxima');
    }

    // Verificar que el estudiante no esté ya inscrito
    const existingEnrollment = await this.prisma.workshopEnrollment.findFirst({
      where: {
        workshopId: data.workshopId,
        studentId: data.studentId,
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('El estudiante ya está inscrito en este taller');
    }

    // Inscribir estudiante
    return this.prisma.workshopEnrollment.create({
      data: {
        workshopId: data.workshopId,
        studentId: data.studentId,
        enrolledAt: new Date(),
      },
      include: {
        workshop: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollmentCode: true,
          },
        },
      },
    });
  }

  // Desmatricular estudiante de taller
  async unenrollStudent(workshopId: string, studentId: string) {
    const enrollment = await this.prisma.workshopEnrollment.findFirst({
      where: {
        workshopId,
        studentId,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('El estudiante no está inscrito en este taller');
    }

    await this.prisma.workshopEnrollment.delete({
      where: { id: enrollment.id },
    });

    return { message: 'Estudiante desmatriculado del taller' };
  }

  // Obtener talleres de un estudiante
  async getStudentWorkshops(studentId: string) {
    return this.prisma.workshopEnrollment.findMany({
      where: { studentId },
      include: {
        workshop: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  // Obtener estudiantes de un taller
  async getWorkshopStudents(workshopId: string) {
    return this.prisma.workshopEnrollment.findMany({
      where: { workshopId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            enrollmentCode: true,
            phone: true,
          },
        },
      },
      orderBy: { enrolledAt: 'asc' },
    });
  }

  // Obtener estadísticas de talleres
  async getWorkshopStats(schoolId: string) {
    const [totalWorkshops, totalEnrollments, workshopsByCapacity] = await Promise.all([
      this.prisma.workshop.count({ where: { schoolId } }),
      this.prisma.workshopEnrollment.count({
        where: { workshop: { schoolId } },
      }),
      this.prisma.workshop.findMany({
        where: { schoolId },
        select: {
          id: true,
          name: true,
          capacity: true,
          _count: {
            select: { enrollments: true },
          },
        },
      }),
    ]);

    const availableSpaces = workshopsByCapacity.reduce((total, workshop) => {
      if (workshop.capacity) {
        return total + (workshop.capacity - workshop._count.enrollments);
      }
      return total;
    }, 0);

    return {
      totalWorkshops,
      totalEnrollments,
      availableSpaces,
      workshops: workshopsByCapacity.map((w) => ({
        id: w.id,
        name: w.name,
        capacity: w.capacity,
        enrolled: w._count.enrollments,
        available: w.capacity ? w.capacity - w._count.enrollments : null,
      })),
    };
  }
}
