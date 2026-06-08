import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeIngredientDto {
  @IsUUID()
  itemId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class CreateRecipeDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  category!: string;

  @IsNumber()
  @Min(1)
  servings!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  yieldPercentage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prepTimeMinutes?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetFoodCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  menuItemId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];
}
