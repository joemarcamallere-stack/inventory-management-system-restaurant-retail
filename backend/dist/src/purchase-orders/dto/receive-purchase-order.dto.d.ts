export declare class ReceiveItemDto {
    id: string;
    receivedQty: number;
    rejectedQty: number;
}
export declare class ReceivePurchaseOrderDto {
    items: ReceiveItemDto[];
}
