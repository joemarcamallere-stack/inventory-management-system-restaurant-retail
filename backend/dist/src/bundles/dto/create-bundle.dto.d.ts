export declare class BundleItemDto {
    inventoryItemId: string;
    quantity: number;
}
export declare class CreateBundleDto {
    name: string;
    discount: number;
    items: BundleItemDto[];
}
