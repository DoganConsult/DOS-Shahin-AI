"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacListQuery = exports.assignProfileBody = exports.accessProfileBody = exports.revokeRoleAssignmentBody = exports.assignRoleBody = exports.updateRoleBody = exports.createRoleBody = exports.bulkAssignPermissionsBody = exports.revokePermissionParams = exports.assignPermissionBody = void 0;
const zod_1 = require("zod");
const roleCode = zod_1.z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/, 'role_code must be lowercase snake_case');
const permissionCode = zod_1.z.string().min(5).max(150).regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, 'permission_code must follow module.resource.action format (3 lowercase dot-separated parts)');
const moduleCode = zod_1.z.string().min(1).max(50).regex(/^[a-z][a-z0-9-]*$/, 'module_code must be lowercase kebab-case');
const scopeType = zod_1.z.enum(['tenant', 'workspace', 'department', 'team', 'entity']).default('tenant');
const authorityLevel = zod_1.z.enum(['view', 'operate', 'approve_low', 'approve_medium', 'approve_high', 'override']).optional();
exports.assignPermissionBody = zod_1.z.object({
    roleCode,
    permissionCode,
    scopeType,
    scopeId: zod_1.z.string().regex(/^\d+$/, 'scope_id must be a numeric string (bigint)').max(20).optional(),
}).strict();
exports.revokePermissionParams = zod_1.z.object({
    roleCode,
    permissionCode,
});
exports.bulkAssignPermissionsBody = zod_1.z.object({
    roleCode,
    permissionCodes: zod_1.z.array(permissionCode).min(1).max(100),
    scopeType,
    scopeId: zod_1.z.string().regex(/^\d+$/, 'scope_id must be a numeric string (bigint)').max(20).optional(),
}).strict();
exports.createRoleBody = zod_1.z.object({
    code: roleCode,
    moduleCode,
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(1000).optional(),
}).strict();
exports.updateRoleBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(1000).optional(),
}).strict();
exports.assignRoleBody = zod_1.z.object({
    userId: zod_1.z.string().min(1).max(64),
    functionalRoleCode: roleCode,
    moduleCode,
    scopeType,
    scopeId: zod_1.z.string().regex(/^\d+$/, 'scope_id must be a numeric string (bigint)').max(20).optional(),
    authorityLevel,
    validFrom: zod_1.z.string().datetime().optional(),
    validTo: zod_1.z.string().datetime().optional(),
    isPrimary: zod_1.z.boolean().default(false),
}).strict();
exports.revokeRoleAssignmentBody = zod_1.z.object({
    userId: zod_1.z.string().min(1).max(64),
    functionalRoleCode: roleCode,
    moduleCode,
    reason: zod_1.z.string().max(500).optional(),
}).strict();
exports.accessProfileBody = zod_1.z.object({
    code: zod_1.z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(1000).optional(),
}).strict();
exports.assignProfileBody = zod_1.z.object({
    userId: zod_1.z.string().min(1).max(64),
    accessProfileCode: zod_1.z.string().min(1).max(100),
    validFrom: zod_1.z.string().datetime().optional(),
    validTo: zod_1.z.string().datetime().optional(),
}).strict();
exports.rbacListQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    moduleCode: moduleCode.optional(),
    roleCode: roleCode.optional(),
    search: zod_1.z.string().max(200).optional(),
}).partial();
//# sourceMappingURL=rbac.schemas.js.map