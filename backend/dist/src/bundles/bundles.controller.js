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
exports.BundlesController = void 0;
const common_1 = require("@nestjs/common");
const bundles_service_1 = require("./bundles.service");
const create_bundle_dto_1 = require("./dto/create-bundle.dto");
const update_bundle_dto_1 = require("./dto/update-bundle.dto");
const reject_bundle_dto_1 = require("./dto/reject-bundle.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let BundlesController = class BundlesController {
    bundlesService;
    constructor(bundlesService) {
        this.bundlesService = bundlesService;
    }
    create(dto, user) {
        return this.bundlesService.create(dto, user.businessId, user.id, user.role);
    }
    findAll(user, status, page, limit) {
        return this.bundlesService.findAll(user.businessId, status, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50);
    }
    findOne(id, user) {
        return this.bundlesService.findOne(id, user.businessId);
    }
    update(id, dto, user) {
        return this.bundlesService.update(id, dto, user.businessId);
    }
    approve(id, user) {
        return this.bundlesService.approve(id, user.businessId, user.id, user.role);
    }
    reject(id, dto, user) {
        return this.bundlesService.reject(id, dto.rejectionReason, user.businessId, user.role);
    }
    activate(id, user) {
        return this.bundlesService.activate(id, user.businessId, user.role);
    }
    deactivate(id, user) {
        return this.bundlesService.deactivate(id, user.businessId, user.role);
    }
    remove(id, user) {
        return this.bundlesService.remove(id, user.businessId, user.role);
    }
};
exports.BundlesController = BundlesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_bundle_dto_1.CreateBundleDto, Object]),
    __metadata("design:returntype", void 0)
], BundlesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], BundlesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BundlesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_bundle_dto_1.UpdateBundleDto, Object]),
    __metadata("design:returntype", void 0)
], BundlesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BundlesController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reject_bundle_dto_1.RejectBundleDto, Object]),
    __metadata("design:returntype", void 0)
], BundlesController.prototype, "reject", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BundlesController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BundlesController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BundlesController.prototype, "remove", null);
exports.BundlesController = BundlesController = __decorate([
    (0, common_1.Controller)('bundles'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [bundles_service_1.BundlesService])
], BundlesController);
//# sourceMappingURL=bundles.controller.js.map