import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SubmissionType } from '../../../../generated/prisma';

export class CreateSubmissionDto {
  @IsUUID()
  taskId: string;

  @IsUUID()
  studentId: string;

  @IsEnum(SubmissionType)
  submissionType: SubmissionType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class GradeSubmissionDto {
  @IsString()
  score: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}
