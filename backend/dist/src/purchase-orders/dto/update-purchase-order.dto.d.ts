import { CreatePurchaseOrderDto } from './create-purchase-order.dto';
declare const UpdatePurchaseOrderDto_base: import("@nestjs/mapped-types").MappedType<Partial<Omit<CreatePurchaseOrderDto, "items">>>;
export declare class UpdatePurchaseOrderDto extends UpdatePurchaseOrderDto_base {
}
export {};
