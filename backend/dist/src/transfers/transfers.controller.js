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
exports.TransfersController = void 0;
const common_1 = require("@nestjs/common");
const transfers_service_1 = require("./transfers.service");
const create_transfer_dto_1 = require("./dto/create-transfer.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let TransfersController = class TransfersController {
    transfersService;
    constructor(transfersService) {
        this.transfersService = transfersService;
    }
    create(dto, user) {
        return this.transfersService.create(dto, user.businessId, user.id);
    }
    findAll(user, status, fromLocationId, toLocationId, page, limit) {
        return this.transfersService.findAll(user.businessId, status, fromLocationId, toLocationId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50);
    }
    findOne(id, user) {
        return this.transfersService.findOne(id, user.businessId);
    }
    dispatch(id, user) {
        return this.transfersService.dispatch(id, user.businessId);
    }
    complete(id, user) {
        return this.transfersService.complete(id, user.businessId, user.id);
    }
    cancel(id, user) {
        return this.transfersService.cancel(id, user.businessId);
    }
};
exports.TransfersController = TransfersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_transfer_dto_1.CreateTransferDto, Object]),
    __metadata("design:returntype", void 0)
], TransfersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('fromLocationId')),
    __param(3, (0, common_1.Query)('toLocationId')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], TransfersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransfersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/dispatch'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransfersController.prototype, "dispatch", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransfersController.prototype, "complete", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransfersController.prototype, "cancel", null);
exports.TransfersController = TransfersController = __decorate([
    (0, common_1.Controller)('transfers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [transfers_service_1.TransfersService])
], TransfersController);
//# sourceMappingURL=transfers.controller.js.map