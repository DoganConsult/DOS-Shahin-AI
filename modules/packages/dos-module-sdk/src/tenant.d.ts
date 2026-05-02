/**
 * @dos/module-sdk tenant utilities
 * Tenant and workspace context helpers for module development
 */
import type { AuthenticatedRequest, AuthenticatedUser, ExternalScope } from '@dos/types';
import type { TenantContract, WorkspaceContract } from '@dos/contracts';
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
/**
 * Extract tenant context from authenticated request
 */
export declare function getTenantContext(req: AuthenticatedRequest): TenantContext;
/**
 * Extract full tenant context including user info
 */
export declare function getFullTenantContext(req: AuthenticatedRequest): FullTenantContext;
/**
 * Build tenant schema name from tenant ID
 */
export declare function buildTenantSchema(tenantId: string): string;
/**
 * Validate tenant schema name
 */
export declare function isValidTenantSchema(schema: string): boolean;
export declare function assertWorkspaceId(workspaceId: string | undefined | null): asserts workspaceId is string;
export declare function assertUserAuthenticated(user: AuthenticatedUser | undefined | null): asserts user is AuthenticatedUser;
export declare function belongsToTenant(user: AuthenticatedUser, tenantId: string): boolean;
export declare function isSuperAdmin(user: AuthenticatedUser): boolean;
export declare function isTenantAdmin(user: AuthenticatedUser): boolean;
export declare function isSystemUser(user: AuthenticatedUser): boolean;
export interface TenantQueryContext {
    tenantId: string;
    tenantSchema: string;
    userId: string;
    workspaceId?: string;
}
export declare function buildTenantQueryContext(ctx: FullTenantContext): TenantQueryContext;
/**
 * Generate tenant-scoped table reference
 * @example tenantTable('users', 'tenant_abc123') => 'tenant_abc123.users'
 */
export declare function tenantTable(tableName: string, tenantSchema: string): string;
export interface WorkspaceContext {
    tenantId: string;
    workspaceId: string;
    tenantSchema: string;
    workspaceName?: string;
}
export declare function getWorkspaceContext(req: AuthenticatedRequest): WorkspaceContext;
export declare function isTenantActive(tenant: TenantContract): boolean;
export declare function isTenantSuspended(tenant: TenantContract): boolean;
export declare function isWorkspaceActive(workspace: WorkspaceContract): boolean;
export declare function canAccessWorkspace(user: AuthenticatedUser, workspace: WorkspaceContract): boolean;
export type SupportedLanguage = 'en' | 'ar';
export declare function getTenantLanguage(tenant: TenantContract): SupportedLanguage;
export declare function isRTL(language: SupportedLanguage): boolean;
export declare function getTenantTimezone(tenant: TenantContract): string;
export declare function formatTenantDate(date: Date, tenant: TenantContract): string;
export declare function formatTenantDateTime(date: Date, tenant: TenantContract): string;
export interface ServiceContext {
    tenantId: string;
    tenantSchema: string;
    userId: string;
    correlationId: string;
    moduleCode?: string;
}
export declare function createServiceContext(req: AuthenticatedRequest, moduleCode?: string): ServiceContext;
export type { TenantContract, WorkspaceContract } from '@dos/contracts';
export type { AuthenticatedRequest, AuthenticatedUser, ExternalScope } from '@dos/types';
