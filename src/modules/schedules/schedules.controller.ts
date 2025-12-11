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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear horario con validación de conflictos' })
  @ApiResponse({ status: 201, description: 'Horario creado' })
  @ApiResponse({ status: 400, description: 'Conflicto de horario detectado' })
  create(
    @Body() data: CreateScheduleDto,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.schedulesService.create(data, schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Listar horarios con filtros' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'classroomId', required: false })
  findAll(
    @CurrentUser('schoolId') schoolId: string,
    @Query('courseId') courseId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('classroomId') classroomId?: string,
  ) {
    return this.schedulesService.findAll(schoolId, courseId, teacherId, classroomId);
  }

  @Get('check-availability')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Verificar disponibilidad antes de crear horario' })
  @ApiQuery({ name: 'courseId', required: true, description: 'ID del curso' })
  @ApiQuery({ name: 'dayOfWeek', required: true, description: 'Día de la semana (0=Dom, 1=Lun, ..., 6=Sab)' })
  @ApiQuery({ name: 'startTime', required: true, description: 'Hora inicio (HH:MM)' })
  @ApiQuery({ name: 'endTime', required: true, description: 'Hora fin (HH:MM)' })
  @ApiResponse({ status: 200, description: 'Resultado de disponibilidad' })
  checkAvailability(
    @Query('courseId', ParseUUIDPipe) courseId: string,
    @Query('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.schedulesService.checkAvailability(courseId, dayOfWeek, startTime, endTime);
  }

  @Get('teacher/:teacherId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Obtener horario completo de un profesor' })
  getTeacherSchedule(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.schedulesService.getTeacherSchedule(teacherId, schoolId);
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Obtener horario completo de un estudiante' })
  getStudentSchedule(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.schedulesService.getStudentSchedule(studentId, schoolId);
  }

  @Get('classroom/:classroomId')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Obtener horario completo de un aula' })
  getClassroomSchedule(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.schedulesService.getClassroomSchedule(classroomId, schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Obtener horario por ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.schedulesService.findOne(id, schoolId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar horario con validación de conflictos' })
  @ApiResponse({ status: 200, description: 'Horario actualizado' })
  @ApiResponse({ status: 400, description: 'Conflicto de horario detectado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateScheduleDto,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.schedulesService.update(id, data, schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar horario' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.schedulesService.remove(id, schoolId);
  }
}
