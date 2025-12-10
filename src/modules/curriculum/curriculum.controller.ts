import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurriculumService } from './curriculum.service';
import { CreateCurriculumUnitDto } from './dto/create-curriculum-unit.dto';
import { UpdateCurriculumUnitDto } from './dto/update-curriculum-unit.dto';
import { CreateCurriculumTopicDto } from './dto/create-curriculum-topic.dto';
import { UpdateCurriculumTopicDto } from './dto/update-curriculum-topic.dto';

@Controller('curriculum')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  // ==================== CURRICULUM UNITS ====================

  @Post('units')
  @Roles('ADMIN', 'TEACHER')
  createUnit(@Body() createDto: CreateCurriculumUnitDto, @Request() req) {
    return this.curriculumService.createUnit(createDto, req.user.schoolId);
  }

  @Get('units')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  findAllUnits(@Request() req, @Query('subjectId') subjectId?: string) {
    return this.curriculumService.findAllUnits(req.user.schoolId, subjectId);
  }

  @Get('units/:id')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  findOneUnit(@Param('id') id: string, @Request() req) {
    return this.curriculumService.findOneUnit(id, req.user.schoolId);
  }

  @Patch('units/:id')
  @Roles('ADMIN', 'TEACHER')
  updateUnit(
    @Param('id') id: string,
    @Body() updateDto: UpdateCurriculumUnitDto,
    @Request() req,
  ) {
    return this.curriculumService.updateUnit(id, updateDto, req.user.schoolId);
  }

  @Delete('units/:id')
  @Roles('ADMIN')
  removeUnit(@Param('id') id: string, @Request() req) {
    return this.curriculumService.removeUnit(id, req.user.schoolId);
  }

  // ==================== CURRICULUM TOPICS ====================

  @Post('topics')
  @Roles('ADMIN', 'TEACHER')
  createTopic(@Body() createDto: CreateCurriculumTopicDto, @Request() req) {
    return this.curriculumService.createTopic(createDto, req.user.schoolId);
  }

  @Get('topics')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  findAllTopics(@Request() req, @Query('curriculumUnitId') curriculumUnitId?: string) {
    return this.curriculumService.findAllTopics(req.user.schoolId, curriculumUnitId);
  }

  @Get('topics/:id')
  @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  findOneTopic(@Param('id') id: string, @Request() req) {
    return this.curriculumService.findOneTopic(id, req.user.schoolId);
  }

  @Patch('topics/:id')
  @Roles('ADMIN', 'TEACHER')
  updateTopic(
    @Param('id') id: string,
    @Body() updateDto: UpdateCurriculumTopicDto,
    @Request() req,
  ) {
    return this.curriculumService.updateTopic(id, updateDto, req.user.schoolId);
  }

  @Delete('topics/:id')
  @Roles('ADMIN')
  removeTopic(@Param('id') id: string, @Request() req) {
    return this.curriculumService.removeTopic(id, req.user.schoolId);
  }
}
