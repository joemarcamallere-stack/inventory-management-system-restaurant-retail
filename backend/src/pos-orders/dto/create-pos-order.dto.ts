import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BusinessModule, POSOrderStatus, POSOrderType } from '@prisma/client';

export class CreatePOSOrderItemDto {
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @IsOptional()
  @IsString()
  itemType?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  customizations?: unknown;
}

export class CreatePOSOrderDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsEnum(POSOrderType)
  orderType!: POSOrderType;

  @IsOptional()
  @IsEnum(POSOrderStatus)
  status?: POSOrderStatus;

  @IsOptional()
  @IsEnum(BusinessModule)
  module?: BusinessModule;

  @IsUUID()
  locationId!: string;

  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  tableName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceCharge?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePOSOrderItemDto)
  items!: CreatePOSOrderItemDto[];
}
