import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { CreateSubmissionDto, GradeSubmissionDto } from './dto/create-submission.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() data: CreateTaskDto) {
    return this.tasksService.create(data);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'type', required: false })
  findAll(@Query('courseId') courseId?: string, @Query('type') type?: string) {
    return this.tasksService.findAll(courseId, type);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(@Param('id') id: string, @Body() data: UpdateTaskDto) {
    return this.tasksService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  @Post('submit')
  @Roles(Role.STUDENT)
  submitTask(@Body() data: CreateSubmissionDto) {
    return this.tasksService.submitTask(data);
  }

  @Post('submissions/:id/grade')
  @Roles(Role.ADMIN, Role.TEACHER)
  gradeSubmission(@Param('id') submissionId: string, @Body() data: GradeSubmissionDto) {
    return this.tasksService.gradeSubmission(submissionId, data);
  }

  @Get('student/:id/submissions')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiQuery({ name: 'courseId', required: false })
  getStudentSubmissions(@Param('id') studentId: string, @Query('courseId') courseId?: string) {
    return this.tasksService.getStudentSubmissions(studentId, courseId);
  }

  @Get('student/:id/pending')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  getPendingTasks(@Param('id') studentId: string) {
    return this.tasksService.getPendingTasks(studentId);
  }
}
