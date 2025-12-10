import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GradesService } from './grades.service';
import { CreateGradeDto, UpdateGradeDto } from './dto/create-grade.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Grades')
@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() data: CreateGradeDto) {
    return this.gradesService.create(data);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'periodId', required: false })
  findAll(
    @Query('courseId') courseId?: string,
    @Query('studentId') studentId?: string,
    @Query('periodId') periodId?: string,
  ) {
    return this.gradesService.findAll(courseId, studentId, periodId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  findOne(@Param('id') id: string) {
    return this.gradesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(@Param('id') id: string, @Body() data: UpdateGradeDto) {
    return this.gradesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string) {
    return this.gradesService.remove(id);
  }

  @Get('student/:studentId/course/:courseId/average')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiQuery({ name: 'periodId', required: false })
  getStudentCourseAverage(
    @Param('studentId') studentId: string,
    @Param('courseId') courseId: string,
    @Query('periodId') periodId?: string,
  ) {
    return this.gradesService.getStudentCourseAverage(studentId, courseId, periodId);
  }

  @Get('student/:studentId/report-card/:periodId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  getStudentReportCard(@Param('studentId') studentId: string, @Param('periodId') periodId: string) {
    return this.gradesService.getStudentReportCard(studentId, periodId);
  }

  @Post('upload-report-card')
  @Roles(Role.ADMIN, Role.TEACHER)
  uploadReportCard(
    @Body('studentId') studentId: string,
    @Body('periodId') periodId: string,
    @Body('grades') excelData: any[],
  ) {
    return this.gradesService.uploadReportCard(studentId, periodId, excelData);
  }

  @Get('course/:courseId/stats')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiQuery({ name: 'periodId', required: false })
  getCourseStats(@Param('courseId') courseId: string, @Query('periodId') periodId?: string) {
    return this.gradesService.getCourseStats(courseId, periodId);
  }
}
