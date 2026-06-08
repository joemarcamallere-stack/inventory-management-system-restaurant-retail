import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export enum TargetCustomer {
  Male = 'Male',
  Female = 'Female',
  Unisex = 'Unisex',
}

export enum InventoryCondition {
  Excellent = 'Excellent',
  Good = 'Good',
  Fair = 'Fair',
  Damaged = 'Damaged',
}

export enum InventoryItemType {
  UkayItem = 'UKAY_ITEM',
  Ingredient = 'INGREDIENT',
  MenuItem = 'MENU_ITEM',
  Supply = 'SUPPLY',
  Bundle = 'BUNDLE',
}

export class CreateInventoryDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsEnum(InventoryItemType)
  itemType?: InventoryItemType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  sku?: string;

  @IsString()
  @MinLength(2)
  category!: string;

  @IsOptional()
  @IsEnum(TargetCustomer)
  targetCustomer?: TargetCustomer;

  @IsOptional()
  @IsString()
  @MinLength(2)
  subcategory?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  size?: string;

  @IsOptional()
  @IsEnum(InventoryCondition)
  condition?: InventoryCondition;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  storageTemperature?: string;

  @IsUUID()
  locationId!: string;
}
