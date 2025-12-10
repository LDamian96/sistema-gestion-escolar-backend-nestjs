import { IsString, IsOptional, IsUUID, IsNumber, Min, Max } from 'class-validator';

export class CreateGradeDto {
  @IsUUID()
  courseId: string;

  @IsUUID()
  studentId: string;

  @IsUUID()
  periodId: string;

  @IsNumber()
  @Min(0)
  @Max(20)
  score: number;

  @IsOptional()
  @IsString()
  letterGrade?: string;

  @IsOptional()
  @IsString()
  observation?: string;
}

export class UpdateGradeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  score?: number;

  @IsOptional()
  @IsString()
  letterGrade?: string;

  @IsOptional()
  @IsString()
  observation?: string;
}
