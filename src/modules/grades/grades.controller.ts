import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { CreateGradeDto, UpdateGradeDto } from './dto/create-grade.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Grades')
@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Crear una nueva nota' })
  create(
    @Body() data: CreateGradeDto,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.gradesService.create(data, schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Listar notas con filtros' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'periodId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('schoolId') schoolId: string,
    @Query('courseId') courseId?: string,
    @Query('studentId') studentId?: string,
    @Query('periodId') periodId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.gradesService.findAll(schoolId, { courseId, studentId, periodId, page, limit });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Obtener una nota por ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role
  ) {
    return this.gradesService.findOne(id, schoolId, userId, role);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Actualizar una nota' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateGradeDto,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.gradesService.update(id, data, schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Eliminar una nota' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.gradesService.remove(id, schoolId);
  }

  @Get('student/:studentId/course/:courseId/average')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Obtener promedio de un estudiante en un curso' })
  @ApiQuery({ name: 'periodId', required: false })
  getStudentCourseAverage(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
    @Query('periodId') periodId?: string,
  ) {
    return this.gradesService.getStudentCourseAverage(
      studentId, courseId, periodId, schoolId, userId, role
    );
  }

  @Get('student/:studentId/report-card/:periodId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Obtener libreta de notas de un estudiante' })
  getStudentReportCard(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('periodId', ParseUUIDPipe) periodId: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role
  ) {
    return this.gradesService.getStudentReportCard(studentId, periodId, schoolId, userId, role);
  }

  @Post('upload-report-card')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Cargar notas desde Excel' })
  uploadReportCard(
    @Body('studentId') studentId: string,
    @Body('periodId') periodId: string,
    @Body('grades') excelData: any[],
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.gradesService.uploadReportCard(studentId, periodId, excelData, schoolId);
  }

  @Get('course/:courseId/stats')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Obtener estadísticas de notas de un curso' })
  @ApiQuery({ name: 'periodId', required: false })
  getCourseStats(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('schoolId') schoolId: string,
    @Query('periodId') periodId?: string
  ) {
    return this.gradesService.getCourseStats(courseId, periodId, schoolId);
  }
}
