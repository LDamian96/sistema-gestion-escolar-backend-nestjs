import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSectionDto, UpdateSectionDto } from './dto/create-section.dto';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSectionDto) {
    // Validar duplicado: mismo nombre en mismo grado
    const existing = await this.prisma.section.findFirst({
      where: {
        gradeLevelId: data.gradeLevelId,
        name: data.name,
      },
    });

    if (existing) {
      throw new BadRequestException(`Ya existe una sección "${data.name}" en este grado`);
    }

    return this.prisma.section.create({
      data,
      include: {
        gradeLevel: {
          include: {
            level: true,
          },
        },
      },
    });
  }

  async findAll(gradeLevelId?: string) {
    return this.prisma.section.findMany({
      where: { ...(gradeLevelId && { gradeLevelId }) },
      include: {
        gradeLevel: {
          include: {
            level: true,
          },
        },
        _count: {
          select: {
            classrooms: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        gradeLevel: {
          include: {
            level: true,
          },
        },
        classrooms: true,
      },
    });

    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }

    return section;
  }

  async update(id: string, data: UpdateSectionDto) {
    await this.findOne(id);

    // Si cambia el nombre, validar duplicado
    if (data.name) {
      const section = await this.prisma.section.findUnique({ where: { id } });
      const existing = await this.prisma.section.findFirst({
        where: {
          gradeLevelId: section.gradeLevelId,
          name: data.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException(`Ya existe una sección "${data.name}" en este grado`);
      }
    }

    return this.prisma.section.update({
      where: { id },
      data,
      include: {
        gradeLevel: {
          include: {
            level: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.section.delete({ where: { id } });
    return { message: 'Sección eliminada' };
  }
}
