import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export enum POSPaymentMethod {
  CASH = 'Cash',
  CARD = 'Card',
  GCASH = 'GCash',
  BANK_TRANSFER = 'Bank Transfer',
  CHECK = 'Check',
}

export class CompletePOSOrderPaymentDto {
  @IsEnum(POSPaymentMethod)
  paymentMethod!: POSPaymentMethod;

  @IsNumber()
  @Min(0)
  amountPaid!: number;

  @IsOptional()
  receiptData?: unknown;
}
