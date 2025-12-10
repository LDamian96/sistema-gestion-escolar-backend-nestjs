import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GradeLevelsService } from './grade-levels.service';
import { CreateGradeLevelDto, UpdateGradeLevelDto } from './dto/create-grade-level.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../../generated/prisma';

@ApiTags('Grade Levels')
@Controller('grade-levels')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class GradeLevelsController {
  constructor(private readonly gradeLevelsService: GradeLevelsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() data: CreateGradeLevelDto) {
    return this.gradeLevelsService.create(data);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiQuery({ name: 'levelId', required: false })
  findAll(@Query('levelId') levelId?: string) {
    return this.gradeLevelsService.findAll(levelId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  findOne(@Param('id') id: string) {
    return this.gradeLevelsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() data: UpdateGradeLevelDto) {
    return this.gradeLevelsService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.gradeLevelsService.remove(id);
  }
}
