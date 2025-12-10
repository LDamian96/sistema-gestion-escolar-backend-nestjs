import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma';

export class RegisterDto {
  @ApiProperty({
    example: 'user@school.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña del usuario',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({
    enum: Role,
    example: Role.STUDENT,
    description: 'Rol del usuario',
  })
  @IsEnum(Role, { message: 'Rol inválido' })
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: Role;

  @ApiProperty({
    example: 'school-uuid-123',
    description: 'ID de la escuela',
  })
  @IsString()
  @IsNotEmpty({ message: 'El schoolId es requerido' })
  schoolId: string;
}
