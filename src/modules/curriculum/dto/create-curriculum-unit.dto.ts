import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateCurriculumUnitDto {
  @IsString()
  subjectId: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;
}
