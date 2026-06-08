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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KitchenOrdersController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const business_modules_guard_1 = require("../auth/business-modules.guard");
const business_modules_decorator_1 = require("../auth/business-modules.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const roles_guard_1 = require("../auth/roles.guard");
const create_kitchen_order_dto_1 = require("./dto/create-kitchen-order.dto");
const void_kitchen_order_dto_1 = require("./dto/void-kitchen-order.dto");
const kitchen_orders_service_1 = require("./kitchen-orders.service");
let KitchenOrdersController = class KitchenOrdersController {
    kitchenOrdersService;
    constructor(kitchenOrdersService) {
        this.kitchenOrdersService = kitchenOrdersService;
    }
    complete(createKitchenOrderDto, currentUser) {
        return this.kitchenOrdersService.complete(createKitchenOrderDto, currentUser.businessId, currentUser.id);
    }
    findAll(currentUser, status) {
        return this.kitchenOrdersService.findAll(currentUser.businessId, status);
    }
    findOne(id, currentUser) {
        return this.kitchenOrdersService.findOne(id, currentUser.businessId);
    }
    void(id, voidKitchenOrderDto, currentUser) {
        return this.kitchenOrdersService.void(id, voidKitchenOrderDto, currentUser.businessId);
    }
};
exports.KitchenOrdersController = KitchenOrdersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_kitchen_order_dto_1.CreateKitchenOrderDto, Object]),
    __metadata("design:returntype", void 0)
], KitchenOrdersController.prototype, "complete", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], KitchenOrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], KitchenOrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/void'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, void_kitchen_order_dto_1.VoidKitchenOrderDto, Object]),
    __metadata("design:returntype", void 0)
], KitchenOrdersController.prototype, "void", null);
exports.KitchenOrdersController = KitchenOrdersController = __decorate([
    (0, common_1.Controller)('kitchen-orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, business_modules_guard_1.BusinessModulesGuard),
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Staff'),
    (0, business_modules_decorator_1.RequiredBusinessModules)('RESTAURANT'),
    __metadata("design:paramtypes", [kitchen_orders_service_1.KitchenOrdersService])
], KitchenOrdersController);
//# sourceMappingURL=kitchen-orders.controller.js.map