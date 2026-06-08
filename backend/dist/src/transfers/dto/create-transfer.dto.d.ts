export declare class TransferItemDto {
    inventoryItemId: string;
    quantity: number;
}
export declare class CreateTransferDto {
    fromLocationId: string;
    toLocationId: string;
    notes?: string;
    items: TransferItemDto[];
}
