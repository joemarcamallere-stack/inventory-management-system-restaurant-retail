import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class UpdateDiningTableDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  tableNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
