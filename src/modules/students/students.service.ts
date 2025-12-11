import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../generated/prisma';

interface FindAllOptions {
  page?: number;
  limit?: number;
  search?: string;
  gradeLevelId?: string;
  sectionId?: string;
}

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(createStudentDto: CreateStudentDto, schoolId: string) {
    const { email, password, enrollmentCode, ...studentData } = createStudentDto;

    // Verificar si el email ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Verificar si el código de matrícula ya existe en la misma escuela
    const existingCode = await this.prisma.student.findFirst({
      where: { enrollmentCode, schoolId },
    });

    if (existingCode) {
      throw new ConflictException('El código de matrícula ya existe');
    }

    // Hash de contraseña con rounds configurables
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hashedPassword = await bcrypt.hash(password, bcryptRounds);

    // Crear usuario y estudiante en una transacción
    const student = await this.prisma.$transaction(async (tx) => {
      // Crear usuario
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: Role.STUDENT,
          schoolId,
        },
      });

      // Crear perfil de estudiante
      return tx.student.create({
        data: {
          userId: user.id,
          schoolId,
          enrollmentCode,
          ...studentData,
          dateOfBirth: new Date(studentData.dateOfBirth),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      });
    });

    return student;
  }

  async findAll(schoolId: string, options: FindAllOptions = {}) {
    const { page = 1, limit = 20, search, gradeLevelId, sectionId } = options;
    const skip = (page - 1) * limit;

    // Construir where con filtros
    const where: any = {
      schoolId,
      user: {
        isActive: true,
        deletedAt: null,
      },
    };

    // Búsqueda por nombre, apellido o código
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { enrollmentCode: { contains: search } },
      ];
    }

    // Filtro por grado o sección via enrollments
    if (gradeLevelId || sectionId) {
      where.enrollments = {
        some: {
          classroom: {
            section: {
              ...(sectionId && { id: sectionId }),
              ...(gradeLevelId && { gradeLevelId }),
            },
          },
        },
      };
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
          enrollments: {
            include: {
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
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data: students,
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
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        schoolId,
        user: { deletedAt: null },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
        parents: {
          include: {
            parent: {
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
        enrollments: {
          include: {
            classroom: {
              include: {
                section: {
                  include: {
                    gradeLevel: {
                      include: {
                        level: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        grades: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            course: {
              include: {
                subject: true,
              },
            },
            period: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Control de acceso por ownership
    if (role === Role.STUDENT && student.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este estudiante');
    }

    // Si es padre, verificar que es padre del estudiante
    if (role === Role.PARENT) {
      const isParent = await this.checkParentOwnership(userId, id);
      if (!isParent) {
        throw new ForbiddenException('No tienes permiso para ver este estudiante');
      }
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto, schoolId: string) {
    // Verificar que el estudiante existe y pertenece a la escuela
    const existing = await this.prisma.student.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    return this.prisma.student.update({
      where: { id: existing.id },
      data: {
        ...updateStudentDto,
        ...(updateStudentDto.dateOfBirth && {
          dateOfBirth: new Date(updateStudentDto.dateOfBirth),
        }),
      },
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
          },
        },
      },
    });
  }

  async remove(id: string, schoolId: string) {
    // Verificar que existe
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Soft delete del usuario
    await this.prisma.user.update({
      where: { id: student.userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return { message: 'Estudiante eliminado exitosamente' };
  }

  // Estadísticas de género
  async getGenderStats(schoolId: string) {
    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        user: { isActive: true, deletedAt: null },
      },
      select: { gender: true },
    });

    const stats = students.reduce(
      (acc, student) => {
        acc[student.gender] = (acc[student.gender] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: students.length,
      byGender: stats,
    };
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
}
