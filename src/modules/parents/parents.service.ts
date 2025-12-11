import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateParentDto, UpdateParentDto, LinkStudentDto } from './dto/create-parent.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../generated/prisma';

interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class ParentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateParentDto, schoolId: string) {
    const { email, password, studentIds, ...parentData } = data;

    // Validar email duplicado
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Usar rounds del env o default a 12
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hashedPassword = await bcrypt.hash(password, bcryptRounds);

    return this.prisma.$transaction(async (tx) => {
      // Crear usuario
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: Role.PARENT,
          schoolId,
        },
      });

      // Crear perfil de padre
      const parent = await tx.parent.create({
        data: {
          userId: user.id,
          schoolId,
          ...parentData,
        },
        include: {
          user: {
            select: { id: true, email: true, isActive: true },
          },
        },
      });

      // Si se proporcionaron studentIds, vincular estudiantes
      if (studentIds && studentIds.length > 0) {
        // Verificar que los estudiantes existen y pertenecen a la misma escuela
        const students = await tx.student.findMany({
          where: {
            id: { in: studentIds },
            schoolId,
          },
        });

        if (students.length !== studentIds.length) {
          throw new NotFoundException('Uno o más estudiantes no fueron encontrados');
        }

        // Crear relaciones
        await tx.studentParent.createMany({
          data: studentIds.map((studentId) => ({
            studentId,
            parentId: parent.id,
            relationship: parentData.relationship,
          })),
        });
      }

      return parent;
    });
  }

  async findAll(schoolId: string, options: PaginationOptions = {}) {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId,
      user: {
        isActive: true,
        deletedAt: null,
      },
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [parents, total] = await Promise.all([
      this.prisma.parent.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, isActive: true },
          },
          students: {
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.parent.count({ where }),
    ]);

    return {
      data: parents,
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
    const parent = await this.prisma.parent.findFirst({
      where: {
        id,
        schoolId,
        user: { deletedAt: null },
      },
      include: {
        user: {
          select: { id: true, email: true, isActive: true, createdAt: true },
        },
        students: {
          include: {
            student: {
              include: {
                grades: {
                  take: 10,
                  orderBy: { createdAt: 'desc' },
                  include: {
                    course: { include: { subject: true } },
                    period: true,
                  },
                },
                payments: {
                  take: 5,
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Padre/apoderado no encontrado');
    }

    // Control de acceso: Un padre solo puede ver su propio perfil
    if (role === Role.PARENT && parent.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este registro');
    }

    return parent;
  }

  async update(id: string, data: UpdateParentDto, schoolId: string) {
    // Verificar existencia
    const parent = await this.prisma.parent.findFirst({
      where: { id, schoolId },
    });

    if (!parent) {
      throw new NotFoundException('Padre/apoderado no encontrado');
    }

    return this.prisma.parent.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, email: true, isActive: true },
        },
      },
    });
  }

  async remove(id: string, schoolId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { id, schoolId },
      include: { user: true },
    });

    if (!parent) {
      throw new NotFoundException('Padre/apoderado no encontrado');
    }

    // Soft delete del usuario
    await this.prisma.user.update({
      where: { id: parent.userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return { message: 'Padre/apoderado eliminado exitosamente' };
  }

  async linkStudent(parentId: string, data: LinkStudentDto, schoolId: string) {
    // Verificar padre
    const parent = await this.prisma.parent.findFirst({
      where: { id: parentId, schoolId },
    });

    if (!parent) {
      throw new NotFoundException('Padre/apoderado no encontrado');
    }

    // Verificar estudiante
    const student = await this.prisma.student.findFirst({
      where: { id: data.studentId, schoolId },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Verificar si ya existe la relación
    const existingLink = await this.prisma.studentParent.findUnique({
      where: {
        studentId_parentId: {
          studentId: data.studentId,
          parentId,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException('El estudiante ya está vinculado a este padre/apoderado');
    }

    // Crear relación
    await this.prisma.studentParent.create({
      data: {
        studentId: data.studentId,
        parentId,
        relationship: data.relationship,
      },
    });

    return { message: 'Estudiante vinculado exitosamente' };
  }

  async unlinkStudent(parentId: string, studentId: string, schoolId: string) {
    // Verificar padre
    const parent = await this.prisma.parent.findFirst({
      where: { id: parentId, schoolId },
    });

    if (!parent) {
      throw new NotFoundException('Padre/apoderado no encontrado');
    }

    // Verificar y eliminar relación
    const link = await this.prisma.studentParent.findUnique({
      where: {
        studentId_parentId: {
          studentId,
          parentId,
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Relación no encontrada');
    }

    await this.prisma.studentParent.delete({
      where: {
        studentId_parentId: {
          studentId,
          parentId,
        },
      },
    });

    return { message: 'Estudiante desvinculado exitosamente' };
  }
}
