import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export enum UserRole {
  Admin = 'Admin',
  Manager = 'Manager',
  Staff = 'Staff',
  Cashier = 'Cashier',
  KitchenStaff = 'KitchenStaff',
  UkayStaff = 'UkayStaff',
}

export enum UserStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsEnum(UserStatus)
  status!: UserStatus;
}
