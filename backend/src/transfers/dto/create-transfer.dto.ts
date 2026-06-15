import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransferItemDto {
  @IsUUID()
  inventoryItemId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;
}

export class CreateTransferDto {
  @IsUUID()
  fromLocationId: string;

  @IsUUID()
  toLocationId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}
