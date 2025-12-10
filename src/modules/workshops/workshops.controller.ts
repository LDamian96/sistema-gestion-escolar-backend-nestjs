import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto, UpdateWorkshopDto, EnrollStudentDto } from './dto/create-workshop.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Workshops')
@Controller('workshops')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() data: CreateWorkshopDto) {
    return this.workshopsService.create(data);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  findAll(@CurrentUser('schoolId') schoolId: string) {
    return this.workshopsService.findAll(schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() data: UpdateWorkshopDto) {
    return this.workshopsService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.workshopsService.remove(id);
  }

  @Post('enroll')
  @Roles(Role.ADMIN)
  enrollStudent(@Body() data: EnrollStudentDto) {
    return this.workshopsService.enrollStudent(data);
  }

  @Delete(':workshopId/student/:studentId')
  @Roles(Role.ADMIN)
  unenrollStudent(@Param('workshopId') workshopId: string, @Param('studentId') studentId: string) {
    return this.workshopsService.unenrollStudent(workshopId, studentId);
  }

  @Get('student/:id/workshops')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  getStudentWorkshops(@Param('id') studentId: string) {
    return this.workshopsService.getStudentWorkshops(studentId);
  }

  @Get(':id/students')
  @Roles(Role.ADMIN, Role.TEACHER)
  getWorkshopStudents(@Param('id') workshopId: string) {
    return this.workshopsService.getWorkshopStudents(workshopId);
  }

  @Get('stats/summary')
  @Roles(Role.ADMIN)
  getWorkshopStats(@CurrentUser('schoolId') schoolId: string) {
    return this.workshopsService.getWorkshopStats(schoolId);
  }
}
