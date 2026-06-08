"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequiredBusinessModules = exports.BUSINESS_MODULES_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.BUSINESS_MODULES_KEY = 'business_modules';
const RequiredBusinessModules = (...modules) => (0, common_1.SetMetadata)(exports.BUSINESS_MODULES_KEY, modules);
exports.RequiredBusinessModules = RequiredBusinessModules;
//# sourceMappingURL=business-modules.decorator.js.map