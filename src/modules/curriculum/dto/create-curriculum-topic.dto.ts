import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateCurriculumTopicDto {
  @IsString()
  curriculumUnitId: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  order: number;
}
