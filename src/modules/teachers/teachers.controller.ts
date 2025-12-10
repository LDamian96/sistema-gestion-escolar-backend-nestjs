import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo profesor (Solo Admin)' })
  @ApiResponse({ status: 201, description: 'Profesor creado' })
  create(
    @Body() createTeacherDto: CreateTeacherDto,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.teachersService.create(createTeacherDto, schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Listar profesores' })
  @ApiResponse({ status: 200, description: 'Lista de profesores' })
  findAll(@CurrentUser('schoolId') schoolId: string) {
    return this.teachersService.findAll(schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Obtener profesor por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del profesor' })
  findOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.teachersService.findOne(id, schoolId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar profesor' })
  @ApiResponse({ status: 200, description: 'Profesor actualizado' })
  update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
    @CurrentUser('schoolId') schoolId: string,
  ) {
    return this.teachersService.update(id, updateTeacherDto, schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar profesor' })
  @ApiResponse({ status: 200, description: 'Profesor eliminado' })
  remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.teachersService.remove(id, schoolId);
  }
}
