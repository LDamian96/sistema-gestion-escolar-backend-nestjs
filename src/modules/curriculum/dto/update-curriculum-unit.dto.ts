import { PartialType } from '@nestjs/mapped-types';
import { CreateCurriculumUnitDto } from './create-curriculum-unit.dto';

export class UpdateCurriculumUnitDto extends PartialType(CreateCurriculumUnitDto) {}
