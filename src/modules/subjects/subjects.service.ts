import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSubjectDto) {
    // Validar duplicado: mismo nombre en mismo grado
    const existing = await this.prisma.subject.findFirst({
      where: {
        gradeLevelId: data.gradeLevelId,
        name: data.name,
      },
    });

    if (existing) {
      throw new BadRequestException(`Ya existe la materia "${data.name}" en este grado`);
    }

    // Validar código duplicado si se proporciona
    if (data.code) {
      const existingCode = await this.prisma.subject.findFirst({
        where: {
          gradeLevelId: data.gradeLevelId,
          code: data.code,
        },
      });

      if (existingCode) {
        throw new BadRequestException(`Ya existe una materia con el código "${data.code}" en este grado`);
      }
    }

    return this.prisma.subject.create({
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
    return this.prisma.subject.findMany({
      where: { ...(gradeLevelId && { gradeLevelId }) },
      include: {
        gradeLevel: {
          include: {
            level: true,
          },
        },
        _count: {
          select: {
            courses: true,
            curriculum: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        gradeLevel: {
          include: {
            level: true,
          },
        },
        courses: {
          include: {
            teacher: { select: { firstName: true, lastName: true } },
            classroom: true,
          },
        },
        curriculum: {
          include: {
            topics: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Materia no encontrada');
    }

    return subject;
  }

  async update(id: string, data: UpdateSubjectDto) {
    await this.findOne(id);

    const subject = await this.prisma.subject.findUnique({ where: { id } });

    // Si cambia el nombre, validar duplicado
    if (data.name) {
      const existing = await this.prisma.subject.findFirst({
        where: {
          gradeLevelId: subject.gradeLevelId,
          name: data.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException(`Ya existe la materia "${data.name}" en este grado`);
      }
    }

    // Si cambia el código, validar duplicado
    if (data.code) {
      const existingCode = await this.prisma.subject.findFirst({
        where: {
          gradeLevelId: subject.gradeLevelId,
          code: data.code,
          NOT: { id },
        },
      });

      if (existingCode) {
        throw new BadRequestException(`Ya existe una materia con el código "${data.code}" en este grado`);
      }
    }

    return this.prisma.subject.update({
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
    await this.prisma.subject.delete({ where: { id } });
    return { message: 'Materia eliminada' };
  }
}
