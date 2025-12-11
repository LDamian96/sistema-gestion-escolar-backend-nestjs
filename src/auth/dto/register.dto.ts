import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Role } from '../../../generated/prisma';

export class RegisterDto {
  @ApiProperty({
    example: 'user@school.com',
    description: 'Email del usuario (único)',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña segura (mín. 8 caracteres, mayúscula, minúscula, número y símbolo)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_.])[A-Za-z\d@$!%*?&#+\-_.]{8,}$/,
    {
      message: 'La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&#+-.)',
    }
  )
  password: string;

  @ApiProperty({
    enum: Role,
    example: Role.STUDENT,
    description: 'Rol del usuario',
  })
  @IsEnum(Role, { message: 'Rol inválido. Valores permitidos: ADMIN, TEACHER, STUDENT, PARENT' })
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: Role;

  @ApiProperty({
    example: 'school-uuid-123',
    description: 'ID de la escuela',
  })
  @IsString()
  @IsNotEmpty({ message: 'El schoolId es requerido' })
  schoolId: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  lastName?: string;
}
