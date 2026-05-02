"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSION_MAP = void 0;
exports.ROLE_PERMISSION_MAP = {
    super_admin: ['read', 'create', 'update', 'delete', 'approve', 'export', 'admin'],
    tenant_admin: ['read', 'create', 'update', 'delete', 'approve', 'export'],
    module_admin: ['read', 'create', 'update', 'delete', 'approve'],
    manager: ['read', 'create', 'update', 'approve'],
    analyst: ['read', 'create', 'update'],
    viewer: ['read'],
};
//# sourceMappingURL=role-permission-map.js.map