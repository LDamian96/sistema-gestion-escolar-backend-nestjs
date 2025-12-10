import { IsString, IsUUID, IsInt, Min } from 'class-validator';

export class CreateGradeLevelDto {
  @IsUUID()
  levelId: string;

  @IsString()
  name: string; // "1°", "2°", "3°"...

  @IsInt()
  @Min(1)
  order: number; // 1, 2, 3...
}

export class UpdateGradeLevelDto {
  @IsString()
  name?: string;

  @IsInt()
  @Min(1)
  order?: number;
}
