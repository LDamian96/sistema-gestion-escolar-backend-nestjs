import { PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';
import { OmitType } from '@nestjs/swagger';

// Omitir email y password del update (no se pueden cambiar directamente)
export class UpdateStudentDto extends PartialType(
  OmitType(CreateStudentDto, ['email', 'password', 'enrollmentCode'] as const),
) {}
