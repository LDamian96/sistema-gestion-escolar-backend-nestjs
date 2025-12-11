import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsUUID,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Gender } from '../../../../generated/prisma';

export class CreateParentDto {
  @ApiProperty({
    example: 'parent@email.com',
    description: 'Email del padre/apoderado',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña segura',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_.])[A-Za-z\d@$!%*?&#+\-_.]{8,}$/,
    {
      message: 'La contraseña debe contener: mayúscula, minúscula, número y símbolo',
    }
  )
  password: string;

  @ApiProperty({
    example: 'Carlos',
    description: 'Nombre del padre/apoderado',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    example: 'García',
    description: 'Apellido del padre/apoderado',
  })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiPropertyOptional({
    example: '+51987654321',
    description: 'Teléfono de contacto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  @Matches(/^[\d\s+\-()]+$/, { message: 'Formato de teléfono inválido' })
  phone?: string;

  @ApiPropertyOptional({
    example: 'Av. Principal 123',
    description: 'Dirección',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'La dirección no puede exceder 255 caracteres' })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @ApiPropertyOptional({
    example: 'Padre',
    description: 'Relación con el estudiante (Padre, Madre, Tutor, etc.)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'La relación no puede exceder 50 caracteres' })
  relationship?: string;

  @ApiPropertyOptional({
    example: 'Ingeniero',
    description: 'Ocupación del padre/apoderado',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La ocupación no puede exceder 100 caracteres' })
  occupation?: string;

  @ApiPropertyOptional({
    example: ['student-uuid-1', 'student-uuid-2'],
    description: 'IDs de los estudiantes asociados',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada studentId debe ser un UUID válido' })
  studentIds?: string[];
}

export class UpdateParentDto extends PartialType(CreateParentDto) {
  // Excluir email y password de la actualización (se manejan por separado)
  email?: never;
  password?: never;
}

export class LinkStudentDto {
  @ApiProperty({
    example: 'student-uuid-123',
    description: 'ID del estudiante a vincular',
  })
  @IsUUID('4', { message: 'El studentId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El studentId es requerido' })
  studentId: string;

  @ApiPropertyOptional({
    example: 'Padre',
    description: 'Relación con el estudiante',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relationship?: string;
}
