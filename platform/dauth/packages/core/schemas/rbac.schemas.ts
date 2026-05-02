import { z } from 'zod';

const roleCode = z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/, 'role_code must be lowercase snake_case');
const permissionCode = z.string().min(5).max(150).regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, 'permission_code must follow module.resource.action format (3 lowercase dot-separated parts)');
const moduleCode = z.string().min(1).max(50).regex(/^[a-z][a-z0-9-]*$/, 'module_code must be lowercase kebab-case');
const scopeType = z.enum(['tenant', 'workspace', 'department', 'team', 'entity']).default('tenant');
const authorityLevel = z.enum(['view', 'operate', 'approve_low', 'approve_medium', 'approve_high', 'override']).optional();

export const assignPermissionBody = z.object({
  roleCode,
  permissionCode,
  scopeType,
  scopeId: z.string().regex(/^\d+$/, 'scope_id must be a numeric string (bigint)').max(20).optional(),
}).strict();

export const revokePermissionParams = z.object({
  roleCode,
  permissionCode,
});

export const bulkAssignPermissionsBody = z.object({
  roleCode,
  permissionCodes: z.array(permissionCode).min(1).max(100),
  scopeType,
  scopeId: z.string().regex(/^\d+$/, 'scope_id must be a numeric string (bigint)').max(20).optional(),
}).strict();

export const createRoleBody = z.object({
  code: roleCode,
  moduleCode,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
}).strict();

export const updateRoleBody = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
}).strict();

export const assignRoleBody = z.object({
  userId: z.string().min(1).max(64),
  functionalRoleCode: roleCode,
  moduleCode,
  scopeType,
  scopeId: z.string().regex(/^\d+$/, 'scope_id must be a numeric string (bigint)').max(20).optional(),
  authorityLevel,
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  isPrimary: z.boolean().default(false),
}).strict();

export const revokeRoleAssignmentBody = z.object({
  userId: z.string().min(1).max(64),
  functionalRoleCode: roleCode,
  moduleCode,
  reason: z.string().max(500).optional(),
}).strict();

export const accessProfileBody = z.object({
  code: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
}).strict();

export const assignProfileBody = z.object({
  userId: z.string().min(1).max(64),
  accessProfileCode: z.string().min(1).max(100),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
}).strict();

export const rbacListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  moduleCode: moduleCode.optional(),
  roleCode: roleCode.optional(),
  search: z.string().max(200).optional(),
}).partial();

export type AssignPermissionInput = z.infer<typeof assignPermissionBody>;
export type BulkAssignPermissionsInput = z.infer<typeof bulkAssignPermissionsBody>;
export type CreateRoleInput = z.infer<typeof createRoleBody>;
export type UpdateRoleInput = z.infer<typeof updateRoleBody>;
export type AssignRoleInput = z.infer<typeof assignRoleBody>;
export type RevokeRoleAssignmentInput = z.infer<typeof revokeRoleAssignmentBody>;
export type AccessProfileInput = z.infer<typeof accessProfileBody>;
export type AssignProfileInput = z.infer<typeof assignProfileBody>;
