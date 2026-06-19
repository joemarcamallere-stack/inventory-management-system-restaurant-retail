import { IsDefined } from 'class-validator';

export class UpsertBusinessSettingDto {
  @IsDefined()
  value!: unknown;
}
