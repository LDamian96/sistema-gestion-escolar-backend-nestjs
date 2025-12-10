import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  classroomId: string;

  @IsOptional()
  @IsDateString()
  enrollDate?: string;
}

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @IsOptional()
  @IsDateString()
  enrollDate?: string;
}
