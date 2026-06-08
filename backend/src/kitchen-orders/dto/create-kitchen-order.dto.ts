import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateKitchenOrderDto {
  @IsString()
  @MinLength(1)
  receiptNo!: string;

  @IsUUID()
  recipeId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
