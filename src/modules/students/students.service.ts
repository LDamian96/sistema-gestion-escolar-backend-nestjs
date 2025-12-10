import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../generated/prisma';

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

    // Verificar si el código de matrícula ya existe
    const existingCode = await this.prisma.student.findUnique({
      where: { enrollmentCode },
    });

    if (existingCode) {
      throw new ConflictException('El código de matrícula ya existe');
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario y estudiante en una transacción
    const student = await this.prisma.$transaction(async (tx) => {
      // Crear usuario
      const user = await tx.user.create({
        data: {
          email,
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

  async findAll(schoolId: string) {
    return this.prisma.student.findMany({
      where: { schoolId },
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        schoolId, // Multi-tenant
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

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto, schoolId: string) {
    // Verificar que el estudiante existe y pertenece a la escuela
    const existing = await this.findOne(id, schoolId);

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
    const student = await this.findOne(id, schoolId);

    // Soft delete del usuario (cascada al estudiante por la relación)
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
      where: { schoolId },
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
}
