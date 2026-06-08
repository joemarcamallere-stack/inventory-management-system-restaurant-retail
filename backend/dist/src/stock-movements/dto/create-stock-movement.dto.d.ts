export declare enum StockMovementType {
    StockIn = "STOCK_IN",
    StockOut = "STOCK_OUT",
    Adjustment = "ADJUSTMENT",
    TransferIn = "TRANSFER_IN",
    TransferOut = "TRANSFER_OUT",
    Sale = "SALE",
    RecipeConsumption = "RECIPE_CONSUMPTION",
    Spoilage = "SPOILAGE",
    Expiry = "EXPIRY",
    VoidRestock = "VOID_RESTOCK"
}
export declare class CreateStockMovementDto {
    itemId: string;
    locationId?: string;
    type: StockMovementType;
    quantity: number;
    reason?: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
}
