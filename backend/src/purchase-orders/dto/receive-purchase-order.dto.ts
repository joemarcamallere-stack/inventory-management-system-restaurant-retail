import { IsArray, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveItemDto {
  @IsUUID()
  id: string;

  @IsNumber()
  @Min(0)
  receivedQty: number;

  @IsNumber()
  @Min(0)
  rejectedQty: number;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];
}
