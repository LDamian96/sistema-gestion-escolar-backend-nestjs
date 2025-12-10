import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() data: CreateScheduleDto) {
    return this.schedulesService.create(data);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'classroomId', required: false })
  findAll(
    @Query('courseId') courseId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('classroomId') classroomId?: string,
  ) {
    return this.schedulesService.findAll(courseId, teacherId, classroomId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() data: UpdateScheduleDto) {
    return this.schedulesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }

  @Get('teacher/:id/schedule')
  @Roles(Role.ADMIN, Role.TEACHER)
  getTeacherSchedule(@Param('id') teacherId: string) {
    return this.schedulesService.getTeacherSchedule(teacherId);
  }

  @Get('student/:id/schedule')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  getStudentSchedule(@Param('id') studentId: string) {
    return this.schedulesService.getStudentSchedule(studentId);
  }

  @Post('check-classroom')
  @Roles(Role.ADMIN)
  checkClassroomAvailability(
    @Body('classroom') classroom: string,
    @Body('dayOfWeek') dayOfWeek: number,
    @Body('startTime') startTime: string,
    @Body('endTime') endTime: string,
  ) {
    return this.schedulesService.checkClassroomAvailability(
      classroom,
      dayOfWeek,
      startTime,
      endTime,
    );
  }
}
