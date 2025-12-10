import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ParentsService } from './parents.service';
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
  create(@Body() data: any, @CurrentUser('schoolId') schoolId: string) {
    return this.parentsService.create(data, schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  findAll(@CurrentUser('schoolId') schoolId: string) {
    return this.parentsService.findAll(schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT)
  findOne(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.parentsService.findOne(id, schoolId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() data: any, @CurrentUser('schoolId') schoolId: string) {
    return this.parentsService.update(id, data, schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser('schoolId') schoolId: string) {
    return this.parentsService.remove(id, schoolId);
  }
}
