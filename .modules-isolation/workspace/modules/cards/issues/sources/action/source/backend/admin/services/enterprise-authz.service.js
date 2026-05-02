"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enterpriseAuthzService = void 0;
exports.enterpriseAuthzService = {
    checkPermission: async (_tenantId, _userId, _permission) => true,
    getRoles: async (_tenantId, _userId) => [],
    hasRole: async (_tenantId, _userId, _role) => true,
};
//# sourceMappingURL=enterprise-authz.service.js.map