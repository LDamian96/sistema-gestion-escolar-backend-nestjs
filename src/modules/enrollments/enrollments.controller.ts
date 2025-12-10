import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/create-enrollment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() data: CreateEnrollmentDto) {
    return this.enrollmentsService.create(data);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'classroomId', required: false })
  findAll(
    @Query('studentId') studentId?: string,
    @Query('classroomId') classroomId?: string,
    @CurrentUser('schoolId') schoolId?: string,
  ) {
    return this.enrollmentsService.findAll(studentId, classroomId, schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  findOne(@Param('id') id: string) {
    return this.enrollmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() data: UpdateEnrollmentDto) {
    return this.enrollmentsService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.enrollmentsService.remove(id);
  }

  @Get('student/:id/courses')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  getStudentCourses(@Param('id') studentId: string) {
    return this.enrollmentsService.getStudentCourses(studentId);
  }

  @Post(':id/transfer')
  @Roles(Role.ADMIN)
  transferStudent(@Param('id') enrollmentId: string, @Body('classroomId') newClassroomId: string) {
    return this.enrollmentsService.transferStudent(enrollmentId, newClassroomId);
  }

  @Post('bulk-enroll')
  @Roles(Role.ADMIN)
  bulkEnroll(@Body('classroomId') classroomId: string, @Body('studentIds') studentIds: string[]) {
    return this.enrollmentsService.bulkEnroll(classroomId, studentIds);
  }

  @Get('stats/summary')
  @Roles(Role.ADMIN)
  getEnrollmentStats(@CurrentUser('schoolId') schoolId: string) {
    return this.enrollmentsService.getEnrollmentStats(schoolId);
  }
}
