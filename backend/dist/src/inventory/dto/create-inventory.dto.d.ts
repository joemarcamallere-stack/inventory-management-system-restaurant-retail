export declare enum TargetCustomer {
    Male = "Male",
    Female = "Female",
    Unisex = "Unisex"
}
export declare enum InventoryCondition {
    Excellent = "Excellent",
    Good = "Good",
    Fair = "Fair",
    Damaged = "Damaged"
}
export declare enum InventoryItemType {
    UkayItem = "UKAY_ITEM",
    Ingredient = "INGREDIENT",
    MenuItem = "MENU_ITEM",
    Supply = "SUPPLY",
    Bundle = "BUNDLE"
}
export declare class CreateInventoryDto {
    name: string;
    itemType?: InventoryItemType;
    sku?: string;
    category: string;
    targetCustomer?: TargetCustomer;
    subcategory?: string;
    size?: string;
    condition?: InventoryCondition;
    quantity: number;
    price: number;
    unit?: string;
    minStock?: number;
    maxStock?: number;
    reorderPoint?: number;
    expiryDate?: string;
    storageTemperature?: string;
    locationId: string;
}
