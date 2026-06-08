export declare enum UserRole {
    Admin = "Admin",
    Manager = "Manager",
    Staff = "Staff",
    Cashier = "Cashier",
    KitchenStaff = "KitchenStaff",
    UkayStaff = "UkayStaff"
}
export declare enum UserStatus {
    Active = "Active",
    Inactive = "Inactive"
}
export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    status: UserStatus;
}
