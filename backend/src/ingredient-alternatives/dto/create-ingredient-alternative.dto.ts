import { IsBoolean, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateIngredientAlternativeDto {
  @IsUUID()
  parentIngredientId!: string;

  @IsUUID()
  alternativeIngredientId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalPrice?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
