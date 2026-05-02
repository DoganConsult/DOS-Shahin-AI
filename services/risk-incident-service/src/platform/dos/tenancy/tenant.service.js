"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantService = exports.tenantSchema = exports.SYSTEM_TENANT = void 0;
var platform_core_1 = require("@dos/platform-core");
Object.defineProperty(exports, "SYSTEM_TENANT", { enumerable: true, get: function () { return platform_core_1.SYSTEM_TENANT; } });
var db_1 = require("@dos/db");
Object.defineProperty(exports, "tenantSchema", { enumerable: true, get: function () { return db_1.tenantSchema; } });
exports.tenantService = {
    resolve: async (_tenantId) => ({ id: '', name: '', schema: '' }),
    list: async () => [],
};
//# sourceMappingURL=tenant.service.js.map