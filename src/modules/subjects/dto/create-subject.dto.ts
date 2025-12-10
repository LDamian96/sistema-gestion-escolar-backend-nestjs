import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateSubjectDto {
  @IsUUID()
  gradeLevelId: string;

  @IsString()
  name: string; // "Matemáticas", "Comunicación"...

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  code?: string; // "MAT", "COM"...
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  code?: string;
}
