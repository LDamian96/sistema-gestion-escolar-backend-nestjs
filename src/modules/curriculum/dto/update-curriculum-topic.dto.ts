import { PartialType } from '@nestjs/mapped-types';
import { CreateCurriculumTopicDto } from './create-curriculum-topic.dto';

export class UpdateCurriculumTopicDto extends PartialType(CreateCurriculumTopicDto) {}
