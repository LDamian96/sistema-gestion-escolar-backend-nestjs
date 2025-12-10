import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'academic-year-uuid' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ example: 'subject-uuid' })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ example: 'teacher-uuid' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ example: 'classroom-uuid' })
  @IsString()
  @IsNotEmpty()
  classroomId: string;
}
