import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BundleItemDto {
  @IsString()
  inventoryItemId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateBundleDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  discount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  items: BundleItemDto[];
}
