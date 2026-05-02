"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDepartmentBody = exports.createDepartmentBody = exports.assignFunctionalRoleBody = exports.assignRaciBody = exports.addTeamMemberBody = exports.updateTeamBody = exports.createTeamBody = exports.listQuerySchema = exports.updateUserBody = exports.createUserBody = void 0;
const zod_1 = require("zod");
// ── Users ──────────────────────────────────────────────────────────────────
exports.createUserBody = zod_1.z.object({
    email: zod_1.z.string().email().max(255).describe('Primary email (unique per tenant)'),
    name: zod_1.z.string().min(1).max(255).describe('Display name'),
    display_name: zod_1.z.string().max(255).optional(),
    role: zod_1.z.string().min(1).max(50).default('user').describe('Platform role code'),
    department_id: zod_1.z.string().uuid().optional(),
    phone: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.updateUserBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    display_name: zod_1.z.string().max(255).optional(),
    role: zod_1.z.string().min(1).max(50).optional(),
    department_id: zod_1.z.string().uuid().optional(),
    phone: zod_1.z.string().max(50).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'suspended']).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    department_id: zod_1.z.string().optional(),
    search: zod_1.z.string().max(200).optional(),
    sortBy: zod_1.z.string().default('created_at'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// ── Teams ──────────────────────────────────────────────────────────────────
exports.createTeamBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).describe('Team display name'),
    code: zod_1.z.string().min(1).max(100).optional().describe('Unique code within tenant'),
    description: zod_1.z.string().max(1000).optional(),
    department_id: zod_1.z.string().uuid().optional(),
    lead_id: zod_1.z.string().uuid().optional(),
});
exports.updateTeamBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(1000).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'archived']).optional(),
    department_id: zod_1.z.string().uuid().optional(),
});
exports.addTeamMemberBody = zod_1.z.object({
    userId: zod_1.z.string().min(1).max(64).describe('User being added to the team'),
    roleInTeam: zod_1.z.string().max(50).optional().describe('Role within the team (default: member)'),
});
const RACI_ROLES = ['responsible', 'accountable', 'consulted', 'informed'];
exports.assignRaciBody = zod_1.z.object({
    userId: zod_1.z.string().min(1).max(64),
    scopeType: zod_1.z.string().min(1).max(50).describe('Scope type (e.g., tenant, organization, module)'),
    scopeId: zod_1.z.string().max(255).optional(),
    raciRole: zod_1.z.enum(RACI_ROLES).describe('RACI role'),
});
// ── Roles ──────────────────────────────────────────────────────────────────
exports.assignFunctionalRoleBody = zod_1.z.object({
    functionalRoleCode: zod_1.z.string().min(1).max(100).describe('Functional role code'),
    authorityLevel: zod_1.z.string().max(50).optional(),
});
exports.createDepartmentBody = zod_1.z.object({
    name_en: zod_1.z.string().min(1).max(255),
    name_ar: zod_1.z.string().max(255).optional(),
    code: zod_1.z.string().max(100).optional(),
    bu_id: zod_1.z.string().uuid(),
    head_user_id: zod_1.z.string().optional(),
    parent_id: zod_1.z.string().uuid().optional(),
});
exports.updateDepartmentBody = zod_1.z.object({
    name_en: zod_1.z.string().min(1).max(255).optional(),
    name_ar: zod_1.z.string().max(255).optional(),
    code: zod_1.z.string().max(100).optional(),
    bu_id: zod_1.z.string().uuid().optional(),
    head_user_id: zod_1.z.string().optional(),
    parent_id: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
//# sourceMappingURL=user.schemas.js.map