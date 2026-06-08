"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInventoryDto = exports.InventoryItemType = exports.InventoryCondition = exports.TargetCustomer = void 0;
const class_validator_1 = require("class-validator");
var TargetCustomer;
(function (TargetCustomer) {
    TargetCustomer["Male"] = "Male";
    TargetCustomer["Female"] = "Female";
    TargetCustomer["Unisex"] = "Unisex";
})(TargetCustomer || (exports.TargetCustomer = TargetCustomer = {}));
var InventoryCondition;
(function (InventoryCondition) {
    InventoryCondition["Excellent"] = "Excellent";
    InventoryCondition["Good"] = "Good";
    InventoryCondition["Fair"] = "Fair";
    InventoryCondition["Damaged"] = "Damaged";
})(InventoryCondition || (exports.InventoryCondition = InventoryCondition = {}));
var InventoryItemType;
(function (InventoryItemType) {
    InventoryItemType["UkayItem"] = "UKAY_ITEM";
    InventoryItemType["Ingredient"] = "INGREDIENT";
    InventoryItemType["MenuItem"] = "MENU_ITEM";
    InventoryItemType["Supply"] = "SUPPLY";
    InventoryItemType["Bundle"] = "BUNDLE";
})(InventoryItemType || (exports.InventoryItemType = InventoryItemType = {}));
class CreateInventoryDto {
    name;
    itemType;
    sku;
    category;
    targetCustomer;
    subcategory;
    size;
    condition;
    quantity;
    price;
    unit;
    minStock;
    maxStock;
    reorderPoint;
    expiryDate;
    storageTemperature;
    locationId;
}
exports.CreateInventoryDto = CreateInventoryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(InventoryItemType),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "itemType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "sku", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(TargetCustomer),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "targetCustomer", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "subcategory", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "size", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(InventoryCondition),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "condition", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "unit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryDto.prototype, "minStock", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryDto.prototype, "maxStock", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryDto.prototype, "reorderPoint", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "expiryDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "storageTemperature", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateInventoryDto.prototype, "locationId", void 0);
//# sourceMappingURL=create-inventory.dto.js.map