import { IsString, IsEnum, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { TaskType } from '../../../../generated/prisma';

export class CreateTaskDto {
  @IsUUID()
  courseId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(TaskType)
  type: TaskType;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
