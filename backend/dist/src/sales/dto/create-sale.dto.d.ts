export declare class SaleItemDto {
    inventoryItemId: string;
    quantity: number;
    unitPrice: number;
}
export declare class CreateSaleDto {
    locationId: string;
    items: SaleItemDto[];
    discount?: number;
    tax?: number;
    paymentMethod: string;
    amountPaid: number;
    customer?: string;
}
