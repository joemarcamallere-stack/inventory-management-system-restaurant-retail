import { IsString } from 'class-validator';

export class RejectBundleDto {
  @IsString()
  rejectionReason: string;
}
