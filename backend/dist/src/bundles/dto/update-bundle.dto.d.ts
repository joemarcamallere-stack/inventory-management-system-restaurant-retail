import { CreateBundleDto } from './create-bundle.dto';
declare const UpdateBundleDto_base: import("@nestjs/mapped-types").MappedType<Partial<Omit<CreateBundleDto, "items">>>;
export declare class UpdateBundleDto extends UpdateBundleDto_base {
}
export {};
