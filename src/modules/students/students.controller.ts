import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Students')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo estudiante (Solo Admin)' })
  @ApiResponse({ status: 201, description: 'Estudiante creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email o código de matrícula duplicado' })
  create(
    @Body() createStudentDto: CreateStudentDto,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.studentsService.create(createStudentDto, schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Listar todos los estudiantes con paginación' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite por página (default: 20)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por nombre, apellido o código' })
  @ApiQuery({ name: 'gradeLevelId', required: false, type: String, description: 'Filtrar por grado' })
  @ApiQuery({ name: 'sectionId', required: false, type: String, description: 'Filtrar por sección' })
  findAll(
    @CurrentUser('schoolId') schoolId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('gradeLevelId') gradeLevelId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.studentsService.findAll(schoolId, { page, limit, search, gradeLevelId, sectionId });
  }

  @Get('stats/gender')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Estadísticas por género' })
  @ApiResponse({ status: 200, description: 'Estadísticas de género' })
  getGenderStats(@CurrentUser('schoolId') schoolId: string) {
    return this.studentsService.getGenderStats(schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Obtener estudiante por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del estudiante' })
  @ApiResponse({ status: 404, description: 'Estudiante no encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role
  ) {
    return this.studentsService.findOne(id, schoolId, userId, role);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar estudiante (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Estudiante actualizado' })
  @ApiResponse({ status: 404, description: 'Estudiante no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.studentsService.update(id, updateStudentDto, schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar estudiante (Solo Admin)' })
  @ApiResponse({ status: 200, description: 'Estudiante eliminado' })
  @ApiResponse({ status: 404, description: 'Estudiante no encontrado' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.studentsService.remove(id, schoolId);
  }
}
