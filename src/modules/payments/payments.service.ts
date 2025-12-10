import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '../../../generated/prisma';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, schoolId: string) {
    const { studentId, dueDate, ...data } = createPaymentDto;

    // Verificar que el estudiante existe y pertenece a la escuela
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    return this.prisma.payment.create({
      data: {
        schoolId,
        studentId,
        dueDate: new Date(dueDate),
        ...data,
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            enrollmentCode: true,
          },
        },
      },
    });
  }

  async findAll(schoolId: string, studentId?: string) {
    return this.prisma.payment.findMany({
      where: {
        schoolId,
        ...(studentId && { studentId }),
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            enrollmentCode: true,
          },
        },
      },
      orderBy: {
        dueDate: 'desc',
      },
    });
  }

  async findOne(id: string, schoolId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            enrollmentCode: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }

  // Procesar pago con Yape
  async processYapePayment(paymentId: string, phoneNumber: string, schoolId: string) {
    const payment = await this.findOne(paymentId, schoolId);

    // Simular integración con Yape
    // En producción, aquí irían las llamadas a la API de Yape
    const yapeConfig = {
      merchantId: this.configService.get('YAPE_MERCHANT_ID'),
      apiKey: this.configService.get('YAPE_API_KEY'),
      phoneNumber: this.configService.get('YAPE_PHONE_NUMBER'),
    };

    // Simulación de respuesta de Yape
    const yapeMockResponse = {
      success: true,
      transactionId: `YAPE-${Date.now()}`,
      amount: payment.amount,
      phoneNumber,
      merchantPhone: yapeConfig.phoneNumber,
      status: 'approved',
    };

    if (yapeMockResponse.success) {
      // Actualizar pago como pagado
      return this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          paidDate: new Date(),
          paymentMethod: 'Yape',
          transactionId: yapeMockResponse.transactionId,
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }

    throw new Error('Error procesando pago con Yape');
  }

  // Estadísticas de pagos
  async getPaymentStats(schoolId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { schoolId },
      select: {
        status: true,
        amount: true,
      },
    });

    const stats = payments.reduce(
      (acc, payment) => {
        acc.total += payment.amount;
        acc.byStatus[payment.status] = (acc.byStatus[payment.status] || 0) + 1;
        acc.totalByStatus[payment.status] =
          (acc.totalByStatus[payment.status] || 0) + payment.amount;
        return acc;
      },
      {
        total: 0,
        byStatus: {} as Record<string, number>,
        totalByStatus: {} as Record<string, number>,
      },
    );

    return {
      count: payments.length,
      ...stats,
    };
  }
}
