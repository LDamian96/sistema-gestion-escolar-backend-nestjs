import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../generated/prisma';

@Injectable()
export class ParentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, schoolId: string) {
    const { email, password, ...parentData } = data;

    // Validar email duplicado
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, password: hashedPassword, role: Role.PARENT, schoolId },
      });

      return tx.parent.create({
        data: { userId: user.id, schoolId, ...parentData },
        include: { user: { select: { email: true, isActive: true } } },
      });
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.parent.findMany({
      where: { schoolId },
      include: {
        user: { select: { email: true, isActive: true } },
        students: { include: { student: true } },
      },
    });
  }

  async findOne(id: string, schoolId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { id, schoolId },
      include: {
        user: true,
        students: { include: { student: { include: { grades: true, payments: true } } } },
      },
    });

    if (!parent) throw new NotFoundException('Padre no encontrado');
    return parent;
  }

  async update(id: string, data: any, schoolId: string) {
    await this.findOne(id, schoolId);
    return this.prisma.parent.update({ where: { id }, data });
  }

  async remove(id: string, schoolId: string) {
    const parent = await this.findOne(id, schoolId);
    await this.prisma.user.update({
      where: { id: parent.userId },
      data: { isActive: false, deletedAt: new Date() },
    });
    return { message: 'Padre eliminado' };
  }
}
