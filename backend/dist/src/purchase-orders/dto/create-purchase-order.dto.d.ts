export declare class PurchaseOrderItemDto {
    inventoryItemId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
}
export declare class CreatePurchaseOrderDto {
    supplierId?: string;
    notes?: string;
    paymentMethod?: string;
    paymentTerms?: string;
    items: PurchaseOrderItemDto[];
}
