import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceService, CreateAttendanceDto } from './attendance.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, AttendanceStatus } from '../../../generated/prisma';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() data: CreateAttendanceDto) {
    return this.attendanceService.create(data);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'date', required: false })
  findAll(
    @Query('courseId') courseId?: string,
    @Query('studentId') studentId?: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.findAll(courseId, studentId, date);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body('status') status: AttendanceStatus,
    @Body('notes') notes?: string,
  ) {
    return this.attendanceService.update(id, status, notes);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }

  @Post('mark-all')
  @Roles(Role.ADMIN, Role.TEACHER)
  markAllStudents(
    @Body('courseId') courseId: string,
    @Body('date') date: string,
    @Body('status') status: AttendanceStatus,
  ) {
    return this.attendanceService.markAllStudents(courseId, date, status);
  }

  @Get('student/:id/summary')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiQuery({ name: 'courseId', required: false })
  getStudentSummary(@Param('id') studentId: string, @Query('courseId') courseId?: string) {
    return this.attendanceService.getStudentSummary(studentId, courseId);
  }
}
