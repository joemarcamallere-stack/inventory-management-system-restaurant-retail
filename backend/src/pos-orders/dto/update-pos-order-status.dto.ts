import { IsEnum, IsOptional, IsString } from 'class-validator';
import { POSOrderStatus } from '@prisma/client';

export class UpdatePOSOrderStatusDto {
  @IsEnum(POSOrderStatus)
  status!: POSOrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
