import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCurriculumUnitDto } from './dto/create-curriculum-unit.dto';
import { UpdateCurriculumUnitDto } from './dto/update-curriculum-unit.dto';
import { CreateCurriculumTopicDto } from './dto/create-curriculum-topic.dto';
import { UpdateCurriculumTopicDto } from './dto/update-curriculum-topic.dto';

@Injectable()
export class CurriculumService {
  constructor(private prisma: PrismaService) {}

  // ==================== CURRICULUM UNITS ====================

  async createUnit(createDto: CreateCurriculumUnitDto, schoolId: string) {
    // Verificar que la materia pertenece a la escuela
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: createDto.subjectId,
        gradeLevel: {
          level: {
            schoolId,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Materia no encontrada o no pertenece a esta escuela');
    }

    return this.prisma.curriculumUnit.create({
      data: createDto,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        topics: true,
      },
    });
  }

  async findAllUnits(schoolId: string, subjectId?: string) {
    const where: any = {
      subject: {
        gradeLevel: {
          level: {
            schoolId,
          },
        },
      },
    };

    if (subjectId) {
      where.subjectId = subjectId;
    }

    return this.prisma.curriculumUnit.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        topics: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOneUnit(id: string, schoolId: string) {
    const unit = await this.prisma.curriculumUnit.findFirst({
      where: {
        id,
        subject: {
          gradeLevel: {
            level: {
              schoolId,
            },
          },
        },
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            gradeLevel: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        topics: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unidad curricular no encontrada');
    }

    return unit;
  }

  async updateUnit(id: string, updateDto: UpdateCurriculumUnitDto, schoolId: string) {
    // Verificar que la unidad pertenece a la escuela
    const unit = await this.prisma.curriculumUnit.findFirst({
      where: {
        id,
        subject: {
          gradeLevel: {
            level: {
              schoolId,
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unidad curricular no encontrada');
    }

    // Si se actualiza el subjectId, verificar que la nueva materia pertenece a la escuela
    if (updateDto.subjectId) {
      const subject = await this.prisma.subject.findFirst({
        where: {
          id: updateDto.subjectId,
          gradeLevel: {
            level: {
              schoolId,
            },
          },
        },
      });

      if (!subject) {
        throw new NotFoundException('Materia no encontrada o no pertenece a esta escuela');
      }
    }

    return this.prisma.curriculumUnit.update({
      where: { id },
      data: updateDto,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        topics: true,
      },
    });
  }

  async removeUnit(id: string, schoolId: string) {
    // Verificar que la unidad pertenece a la escuela
    const unit = await this.prisma.curriculumUnit.findFirst({
      where: {
        id,
        subject: {
          gradeLevel: {
            level: {
              schoolId,
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unidad curricular no encontrada');
    }

    await this.prisma.curriculumUnit.delete({
      where: { id },
    });

    return { message: 'Unidad curricular eliminada exitosamente' };
  }

  // ==================== CURRICULUM TOPICS ====================

  async createTopic(createDto: CreateCurriculumTopicDto, schoolId: string) {
    // Verificar que la unidad curricular pertenece a la escuela
    const unit = await this.prisma.curriculumUnit.findFirst({
      where: {
        id: createDto.curriculumUnitId,
        subject: {
          gradeLevel: {
            level: {
              schoolId,
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unidad curricular no encontrada o no pertenece a esta escuela');
    }

    return this.prisma.curriculumTopic.create({
      data: createDto,
      include: {
        curriculumUnit: {
          select: {
            id: true,
            name: true,
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllTopics(schoolId: string, curriculumUnitId?: string) {
    const where: any = {
      curriculumUnit: {
        subject: {
          gradeLevel: {
            level: {
              schoolId,
            },
          },
        },
      },
    };

    if (curriculumUnitId) {
      where.curriculumUnitId = curriculumUnitId;
    }

    return this.prisma.curriculumTopic.findMany({
      where,
      include: {
        curriculumUnit: {
          select: {
            id: true,
            name: true,
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOneTopic(id: string, schoolId: string) {
    const topic = await this.prisma.curriculumTopic.findFirst({
      where: {
        id,
        curriculumUnit: {
          subject: {
            gradeLevel: {
              level: {
                schoolId,
              },
            },
          },
        },
      },
      include: {
        curriculumUnit: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Tema curricular no encontrado');
    }

    return topic;
  }

  async updateTopic(id: string, updateDto: UpdateCurriculumTopicDto, schoolId: string) {
    // Verificar que el tema pertenece a la escuela
    const topic = await this.prisma.curriculumTopic.findFirst({
      where: {
        id,
        curriculumUnit: {
          subject: {
            gradeLevel: {
              level: {
                schoolId,
              },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Tema curricular no encontrado');
    }

    // Si se actualiza el curriculumUnitId, verificar que la nueva unidad pertenece a la escuela
    if (updateDto.curriculumUnitId) {
      const unit = await this.prisma.curriculumUnit.findFirst({
        where: {
          id: updateDto.curriculumUnitId,
          subject: {
            gradeLevel: {
              level: {
                schoolId,
              },
            },
          },
        },
      });

      if (!unit) {
        throw new NotFoundException('Unidad curricular no encontrada o no pertenece a esta escuela');
      }
    }

    return this.prisma.curriculumTopic.update({
      where: { id },
      data: updateDto,
      include: {
        curriculumUnit: {
          select: {
            id: true,
            name: true,
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async removeTopic(id: string, schoolId: string) {
    // Verificar que el tema pertenece a la escuela
    const topic = await this.prisma.curriculumTopic.findFirst({
      where: {
        id,
        curriculumUnit: {
          subject: {
            gradeLevel: {
              level: {
                schoolId,
              },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Tema curricular no encontrado');
    }

    await this.prisma.curriculumTopic.delete({
      where: { id },
    });

    return { message: 'Tema curricular eliminado exitosamente' };
  }
}
