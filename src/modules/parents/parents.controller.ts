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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import { CreateParentDto, UpdateParentDto, LinkStudentDto } from './dto/create-parent.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Parents')
@Controller('parents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo padre/apoderado' })
  create(
    @Body() createParentDto: CreateParentDto,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.parentsService.create(createParentDto, schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Listar todos los padres/apoderados' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @CurrentUser('schoolId') schoolId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string
  ) {
    return this.parentsService.findAll(schoolId, { page, limit, search });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT)
  @ApiOperation({ summary: 'Obtener un padre/apoderado por ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('schoolId') schoolId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role
  ) {
    return this.parentsService.findOne(id, schoolId, userId, role);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar un padre/apoderado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParentDto: UpdateParentDto,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.parentsService.update(id, updateParentDto, schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar un padre/apoderado (soft delete)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.parentsService.remove(id, schoolId);
  }

  @Post(':id/link-student')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Vincular un estudiante al padre/apoderado' })
  linkStudent(
    @Param('id', ParseUUIDPipe) parentId: string,
    @Body() linkStudentDto: LinkStudentDto,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.parentsService.linkStudent(parentId, linkStudentDto, schoolId);
  }

  @Delete(':id/unlink-student/:studentId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desvincular un estudiante del padre/apoderado' })
  unlinkStudent(
    @Param('id', ParseUUIDPipe) parentId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser('schoolId') schoolId: string
  ) {
    return this.parentsService.unlinkStudent(parentId, studentId, schoolId);
  }
}
