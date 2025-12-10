import { IsString, IsUUID, IsInt, IsOptional, Min } from 'class-validator';

export class CreateSectionDto {
  @IsUUID()
  gradeLevelId: string;

  @IsString()
  name: string; // "A", "B", "C"...

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
