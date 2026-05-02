/**
 * Module Security Seeder Service
 *
 * Seeds all 25 module security definitions (roles, permissions, actions,
 * SoD rules, approval matrices, and default field RBAC) into the tenant
 * schema tables created by migrations 408-415.
 *
 * All operations use upsert (ON CONFLICT DO UPDATE) so the seeder is
 * fully idempotent and safe to re-run.
 */
import { Pool } from 'pg';
/**
 * Seed all module security data for a single tenant.
 *
 * @param tenantId - Tenant UUID (schema = tenant_{tenantId})
 * @param pool     - Shared PG connection pool
 * @returns Summary object with per-module counts and any errors
 */
export declare function seedAllModuleSecurity(tenantId: string, pool: Pool): Promise<SeedResult>;
export interface ModuleSeedCounts {
    roles: number;
    permissions: number;
    actions: number;
    rolePermMap: number;
    roleActionMap: number;
    approval: number;
    sod: number;
    fieldRbac: number;
}
export interface SeedResult {
    modules: Record<string, ModuleSeedCounts>;
    errors: Array<{
        moduleCode: string;
        error: string;
    }>;
}
