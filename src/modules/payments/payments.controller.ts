import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo pago (Solo Admin)' })
  @ApiResponse({ status: 201, description: 'Pago creado exitosamente' })
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.paymentsService.create(createPaymentDto, schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'Listar todos los pagos' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiResponse({ status: 200, description: 'Lista de pagos' })
  findAll(
    @CurrentUser('schoolId') schoolId: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.paymentsService.findAll(schoolId, studentId);
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Estadísticas de pagos' })
  @ApiResponse({ status: 200, description: 'Estadísticas' })
  getStats(@CurrentUser('schoolId') schoolId: string) {
    return this.paymentsService.getPaymentStats(schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'Obtener pago por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del pago' })
  findOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.paymentsService.findOne(id, schoolId);
  }

  @Post(':id/yape')
  @Roles(Role.ADMIN, Role.PARENT, Role.STUDENT)
  @ApiOperation({ summary: 'Procesar pago con Yape' })
  @ApiResponse({ status: 200, description: 'Pago procesado con Yape' })
  processYapePayment(
    @Param('id') id: string,
    @Body('phoneNumber') phoneNumber: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.paymentsService.processYapePayment(id, phoneNumber, schoolId);
  }
}
