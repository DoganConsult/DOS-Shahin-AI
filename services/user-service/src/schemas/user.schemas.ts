import { z } from 'zod';

// ── Users ──────────────────────────────────────────────────────────────────

export const createUserBody = z.object({
  email:         z.string().email().max(255).describe('Primary email (unique per tenant)'),
  name:          z.string().min(1).max(255).describe('Display name'),
  display_name:  z.string().max(255).optional(),
  role:          z.string().min(1).max(50).default('user').describe('Platform role code'),
  department_id: z.string().uuid().optional(),
  phone:         z.string().max(50).optional(),
  metadata:      z.record(z.unknown()).optional(),
});

export const updateUserBody = z.object({
  name:          z.string().min(1).max(255).optional(),
  display_name:  z.string().max(255).optional(),
  role:          z.string().min(1).max(50).optional(),
  department_id: z.string().uuid().optional(),
  phone:         z.string().max(50).optional(),
  status:        z.enum(['active', 'inactive', 'suspended']).optional(),
  metadata:      z.record(z.unknown()).optional(),
});

export const listQuerySchema = z.object({
  page:          z.coerce.number().int().min(1).default(1),
  pageSize:      z.coerce.number().int().min(1).max(100).default(20),
  status:        z.string().optional(),
  role:          z.string().optional(),
  department_id: z.string().optional(),
  search:        z.string().max(200).optional(),
  sortBy:        z.string().default('created_at'),
  sortOrder:     z.enum(['asc', 'desc']).default('desc'),
});

// ── Teams ──────────────────────────────────────────────────────────────────

export const createTeamBody = z.object({
  name:          z.string().min(1).max(255).describe('Team display name'),
  code:          z.string().min(1).max(100).optional().describe('Unique code within tenant'),
  description:   z.string().max(1000).optional(),
  department_id: z.string().uuid().optional(),
  lead_id:       z.string().uuid().optional(),
});

export const updateTeamBody = z.object({
  name:          z.string().min(1).max(255).optional(),
  description:   z.string().max(1000).optional(),
  status:        z.enum(['active', 'inactive', 'archived']).optional(),
  department_id: z.string().uuid().optional(),
});

export const addTeamMemberBody = z.object({
  userId:     z.string().min(1).max(64).describe('User being added to the team'),
  roleInTeam: z.string().max(50).optional().describe('Role within the team (default: member)'),
});

const RACI_ROLES = ['responsible', 'accountable', 'consulted', 'informed'] as const;

export const assignRaciBody = z.object({
  userId:    z.string().min(1).max(64),
  scopeType: z.string().min(1).max(50).describe('Scope type (e.g., tenant, organization, module)'),
  scopeId:   z.string().max(255).optional(),
  raciRole:  z.enum(RACI_ROLES).describe('RACI role'),
});

// ── Roles ──────────────────────────────────────────────────────────────────

export const assignFunctionalRoleBody = z.object({
  functionalRoleCode: z.string().min(1).max(100).describe('Functional role code'),
  authorityLevel:     z.string().max(50).optional(),
});

export const createDepartmentBody = z.object({
  name_en:      z.string().min(1).max(255),
  name_ar:      z.string().max(255).optional(),
  code:         z.string().max(100).optional(),
  bu_id:        z.string().uuid(),
  head_user_id: z.string().optional(),
  parent_id:    z.string().uuid().optional(),
});

export const updateDepartmentBody = z.object({
  name_en:      z.string().min(1).max(255).optional(),
  name_ar:      z.string().max(255).optional(),
  code:         z.string().max(100).optional(),
  bu_id:        z.string().uuid().optional(),
  head_user_id: z.string().optional(),
  parent_id:    z.string().uuid().optional(),
  status:       z.enum(['active', 'inactive']).optional(),
});
