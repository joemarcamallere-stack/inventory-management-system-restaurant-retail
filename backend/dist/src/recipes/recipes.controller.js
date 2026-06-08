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
exports.RecipesController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const business_modules_guard_1 = require("../auth/business-modules.guard");
const business_modules_decorator_1 = require("../auth/business-modules.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const roles_guard_1 = require("../auth/roles.guard");
const create_recipe_dto_1 = require("./dto/create-recipe.dto");
const update_recipe_dto_1 = require("./dto/update-recipe.dto");
const recipes_service_1 = require("./recipes.service");
let RecipesController = class RecipesController {
    recipesService;
    constructor(recipesService) {
        this.recipesService = recipesService;
    }
    create(createRecipeDto, currentUser) {
        return this.recipesService.create(createRecipeDto, currentUser.businessId);
    }
    findAll(currentUser, active) {
        return this.recipesService.findAll(currentUser.businessId, active);
    }
    findOne(id, currentUser) {
        return this.recipesService.findOne(id, currentUser.businessId);
    }
    update(id, updateRecipeDto, currentUser) {
        return this.recipesService.update(id, updateRecipeDto, currentUser.businessId);
    }
    remove(id, currentUser) {
        return this.recipesService.remove(id, currentUser.businessId);
    }
};
exports.RecipesController = RecipesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_recipe_dto_1.CreateRecipeDto, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_recipe_dto_1.UpdateRecipeDto, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecipesController.prototype, "remove", null);
exports.RecipesController = RecipesController = __decorate([
    (0, common_1.Controller)('recipes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, business_modules_guard_1.BusinessModulesGuard),
    (0, roles_decorator_1.Roles)('Admin', 'Manager', 'Staff'),
    (0, business_modules_decorator_1.RequiredBusinessModules)('RESTAURANT'),
    __metadata("design:paramtypes", [recipes_service_1.RecipesService])
], RecipesController);
//# sourceMappingURL=recipes.controller.js.map