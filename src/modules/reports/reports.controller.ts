import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('report-card/:studentId/:periodId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Generar boleta de notas en PDF' })
  @ApiResponse({ status: 200, description: 'PDF generado exitosamente' })
  @ApiResponse({ status: 404, description: 'Estudiante o periodo no encontrado' })
  async generateReportCard(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Res() res: Response,
  ) {
    return this.reportsService.generateReportCard(studentId, periodId, schoolId, res);
  }

  @Get('attendance/:courseId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Generar reporte de asistencia en PDF' })
  @ApiResponse({ status: 200, description: 'PDF generado exitosamente' })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Fecha inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'Fecha fin (YYYY-MM-DD)' })
  async generateAttendanceReport(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('schoolId') schoolId: string,
    @Res() res: Response,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Las fechas de inicio y fin son requeridas');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    if (start > end) {
      throw new BadRequestException('La fecha de inicio debe ser menor a la fecha de fin');
    }

    return this.reportsService.generateAttendanceReport(courseId, start, end, schoolId, res);
  }
}
