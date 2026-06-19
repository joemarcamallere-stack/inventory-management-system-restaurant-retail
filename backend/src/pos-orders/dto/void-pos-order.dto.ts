import { IsString, MinLength } from 'class-validator';

export class VoidPOSOrderDto {
  @IsString()
  @MinLength(1)
  voidReason!: string;
}
