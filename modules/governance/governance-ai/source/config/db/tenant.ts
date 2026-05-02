/**
 * @dos/module-sdk tenant utilities
 * Tenant and workspace context helpers for module development
 */

import type { AuthenticatedRequest, AuthenticatedUser, ExternalScope } from '@dos/types';
import type { TenantContract, WorkspaceContract } from '@dos/contracts';
import { assertTenantId } from './db';

// ────────────────────────────────────────────────────────────────────────────
// Tenant Context Types
// ────────────────────────────────────────────────────────────────────────────

export interface TenantContext {
  tenantId: string;
  tenantSchema: string;
  workspaceId?: string;
  moduleCode?: string;
  correlationId?: string;
}

export interface FullTenantContext extends TenantContext {
  user: AuthenticatedUser;
  scopes: ExternalScope[];
  productCode?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Context Extraction
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extract tenant context from authenticated request
 */
export function getTenantContext(req: AuthenticatedRequest): TenantContext {
  const tenantId = req.tenantId!;
  if (!tenantId) {
    throw new Error('Request missing tenantId - middleware may not be applied');
  }
  return {
    tenantId,
    tenantSchema: req.tenantSchema || buildTenantSchema(tenantId),
    workspaceId: (req as unknown as { query?: Record<string, unknown> }).query?.workspaceId as string | undefined,
    correlationId: req.correlationId,
  };
}

/**
 * Extract full tenant context including user info
 */
export function getFullTenantContext(req: AuthenticatedRequest): FullTenantContext {
  const baseCtx = getTenantContext(req);
  const user = req.user!;
  if (!user) {
    throw new Error('Request missing user - authentication middleware may not be applied');
  }
  return {
    ...baseCtx,
    user,
    scopes: req.externalScope ? [req.externalScope] : [],
  };
}

/**
 * Build tenant schema name from tenant ID
 */
export function buildTenantSchema(tenantId: string): string {
  if (!tenantId) throw new Error('tenantId is required');
  return `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '')}`;
}

/**
 * Validate tenant schema name
 */
export function isValidTenantSchema(schema: string): boolean {
  return /^tenant_[a-zA-Z0-9_]+$/.test(schema);
}

// ────────────────────────────────────────────────────────────────────────────
// Tenant Assertions
// ────────────────────────────────────────────────────────────────────────────

export function assertWorkspaceId(workspaceId: string | undefined | null): asserts workspaceId is string {
  if (!workspaceId) {
    throw new Error('workspaceId is required');
  }
}

export function assertUserAuthenticated(user: AuthenticatedUser | undefined | null): asserts user is AuthenticatedUser {
  if (!user || !user.userId) {
    throw new Error('User not authenticated');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Tenant Membership Helpers
// ────────────────────────────────────────────────────────────────────────────

export function belongsToTenant(user: AuthenticatedUser, tenantId: string): boolean {
  return user.tenantId === tenantId;
}

export function isSuperAdmin(user: AuthenticatedUser): boolean {
  return user.role?.toLowerCase() === 'super_admin' || user.isSuperAdmin === true;
}

export function isTenantAdmin(user: AuthenticatedUser): boolean {
  const role = user.role?.toLowerCase();
  return role === 'tenant_admin' || role === 'admin' || isSuperAdmin(user);
}

export function isSystemUser(user: AuthenticatedUser): boolean {
  return user.actorType === 'system' || user.userId === 'SYSTEM';
}

// ────────────────────────────────────────────────────────────────────────────
// Multi-Tenant Query Helpers
// ────────────────────────────────────────────────────────────────────────────

export interface TenantQueryContext {
  tenantId: string;
  tenantSchema: string;
  userId: string;
  workspaceId?: string;
}

export function buildTenantQueryContext(ctx: FullTenantContext): TenantQueryContext {
  return {
    tenantId: ctx.tenantId,
    tenantSchema: ctx.tenantSchema,
    userId: ctx.user.userId ?? '',
    workspaceId: ctx.workspaceId,
  };
}

/**
 * Generate tenant-scoped table reference
 * @example tenantTable('users', 'tenant_abc123') => 'tenant_abc123.users'
 */
export function tenantTable(tableName: string, tenantSchema: string): string {
  if (!isValidTenantSchema(tenantSchema)) {
    throw new Error(`Invalid tenant schema: ${tenantSchema}`);
  }
  return `${tenantSchema}.${tableName}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Workspace Helpers
// ────────────────────────────────────────────────────────────────────────────

export interface WorkspaceContext {
  tenantId: string;
  workspaceId: string;
  tenantSchema: string;
  workspaceName?: string;
}

export function getWorkspaceContext(req: AuthenticatedRequest): WorkspaceContext {
  const tenantCtx = getTenantContext(req);
  const rawReq = req as unknown as { query?: Record<string, unknown>; params?: Record<string, unknown> };
  const workspaceId = rawReq.query?.workspaceId as string || rawReq.params?.workspaceId as string;
  if (!workspaceId) {
    throw new Error('workspaceId is required in query or params');
  }
  return {
    ...tenantCtx,
    workspaceId,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Tenant Contract Helpers
// ────────────────────────────────────────────────────────────────────────────

export function isTenantActive(tenant: TenantContract): boolean {
  return tenant.status === 'active';
}

export function isTenantSuspended(tenant: TenantContract): boolean {
  return tenant.status === 'suspended';
}

export function isWorkspaceActive(workspace: WorkspaceContract): boolean {
  return workspace.isActive === true;
}

export function canAccessWorkspace(
  user: AuthenticatedUser,
  workspace: WorkspaceContract
): boolean {
  return belongsToTenant(user, workspace.tenantId) && isWorkspaceActive(workspace);
}

// ────────────────────────────────────────────────────────────────────────────
// Tenant Language Helpers
// ────────────────────────────────────────────────────────────────────────────

export type SupportedLanguage = 'en' | 'ar';

const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'ar'];

export function getTenantLanguage(tenant: TenantContract): SupportedLanguage {
  const lang = tenant.language?.toLowerCase();
  if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

export function isRTL(language: SupportedLanguage): boolean {
  return language === 'ar';
}

// ────────────────────────────────────────────────────────────────────────────
// Tenant Timezone Helpers
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIMEZONE = 'UTC';

export function getTenantTimezone(tenant: TenantContract): string {
  return tenant.timezone || DEFAULT_TIMEZONE;
}

export function formatTenantDate(date: Date, tenant: TenantContract): string {
  const timezone = getTenantTimezone(tenant);
  const language = getTenantLanguage(tenant);
  try {
    return new Intl.DateTimeFormat(language, { timeZone: timezone }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function formatTenantDateTime(date: Date, tenant: TenantContract): string {
  const timezone = getTenantTimezone(tenant);
  const language = getTenantLanguage(tenant);
  try {
    return new Intl.DateTimeFormat(language, {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Service Context Factories
// ────────────────────────────────────────────────────────────────────────────

export interface ServiceContext {
  tenantId: string;
  tenantSchema: string;
  userId: string;
  correlationId: string;
  moduleCode?: string;
}

export function createServiceContext(req: AuthenticatedRequest, moduleCode?: string): ServiceContext {
  const ctx = getFullTenantContext(req);
  return {
    tenantId: ctx.tenantId,
    tenantSchema: ctx.tenantSchema,
    userId: ctx.user.userId ?? '',
    correlationId: ctx.correlationId || generateCorrelationId(),
    moduleCode,
  };
}

function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Re-export types
// ────────────────────────────────────────────────────────────────────────────

export type { TenantContract, WorkspaceContract } from '@dos/contracts';
export type { AuthenticatedRequest, AuthenticatedUser, ExternalScope } from '@dos/types';

// Re-export withTenantClient from @dos/db for transaction.ts consumers.
export { withTenantClient } from '@dos/db';
