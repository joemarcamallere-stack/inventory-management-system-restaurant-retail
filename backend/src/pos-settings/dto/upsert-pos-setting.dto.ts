import { IsDefined } from 'class-validator';

export class UpsertPOSSettingDto {
  @IsDefined()
  value!: unknown;
}
