import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGradeLevelDto, UpdateGradeLevelDto } from './dto/create-grade-level.dto';

@Injectable()
export class GradeLevelsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateGradeLevelDto) {
    // Validar duplicado: mismo nombre en mismo nivel
    const existing = await this.prisma.gradeLevel.findFirst({
      where: {
        levelId: data.levelId,
        name: data.name,
      },
    });

    if (existing) {
      throw new BadRequestException(`Ya existe un grado con el nombre "${data.name}" en este nivel`);
    }

    return this.prisma.gradeLevel.create({
      data,
      include: {
        level: true,
      },
    });
  }

  async findAll(levelId?: string) {
    return this.prisma.gradeLevel.findMany({
      where: { ...(levelId && { levelId }) },
      include: {
        level: true,
        sections: true,
        _count: {
          select: {
            sections: true,
            subjects: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const gradeLevel = await this.prisma.gradeLevel.findUnique({
      where: { id },
      include: {
        level: true,
        sections: true,
        subjects: true,
      },
    });

    if (!gradeLevel) {
      throw new NotFoundException('Grado no encontrado');
    }

    return gradeLevel;
  }

  async update(id: string, data: UpdateGradeLevelDto) {
    await this.findOne(id);

    // Si cambia el nombre, validar duplicado
    if (data.name) {
      const gradeLevel = await this.prisma.gradeLevel.findUnique({ where: { id } });
      const existing = await this.prisma.gradeLevel.findFirst({
        where: {
          levelId: gradeLevel.levelId,
          name: data.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException(`Ya existe un grado con el nombre "${data.name}" en este nivel`);
      }
    }

    return this.prisma.gradeLevel.update({
      where: { id },
      data,
      include: { level: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.gradeLevel.delete({ where: { id } });
    return { message: 'Grado eliminado' };
  }
}
