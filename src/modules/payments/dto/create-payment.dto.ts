import { IsString, IsNotEmpty, IsNumber, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../../../../generated/prisma';

export enum PaymentMethod {
  CASH = 'Efectivo',
  TRANSFER = 'Transferencia',
  CARD = 'Tarjeta',
  YAPE = 'Yape',
  STRIPE = 'Stripe',
  MERCADOPAGO = 'MercadoPago',
}

export class CreatePaymentDto {
  @ApiProperty({ example: 'student-uuid-123' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: 350.00 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'Pensión Diciembre 2024' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '2024-12-05' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.YAPE })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;
}
