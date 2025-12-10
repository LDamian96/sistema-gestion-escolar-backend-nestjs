import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../generated/prisma';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async create(createTeacherDto: CreateTeacherDto, schoolId: string) {
    const { email, password, ...teacherData } = createTeacherDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: Role.TEACHER,
          schoolId,
        },
      });

      return tx.teacher.create({
        data: {
          userId: user.id,
          schoolId,
          ...teacherData,
          ...(teacherData.dateOfBirth && {
            dateOfBirth: new Date(teacherData.dateOfBirth),
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
      });
    });

    return teacher;
  }

  async findAll(schoolId: string) {
    return this.prisma.teacher.findMany({
      where: { schoolId },
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
          },
        },
        courses: {
          include: {
            subject: true,
            classroom: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, schoolId },
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
        courses: {
          include: {
            subject: true,
            classroom: {
              include: {
                section: {
                  include: {
                    gradeLevel: true,
                  },
                },
              },
            },
            schedules: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto, schoolId: string) {
    const existing = await this.findOne(id, schoolId);

    return this.prisma.teacher.update({
      where: { id: existing.id },
      data: {
        ...updateTeacherDto,
        ...(updateTeacherDto.dateOfBirth && {
          dateOfBirth: new Date(updateTeacherDto.dateOfBirth),
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
    const teacher = await this.findOne(id, schoolId);

    await this.prisma.user.update({
      where: { id: teacher.userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return { message: 'Profesor eliminado exitosamente' };
  }
}
