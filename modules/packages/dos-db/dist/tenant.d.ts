import { PoolClient } from 'pg';
export declare function assertTenantId(tenantId: unknown): asserts tenantId is string;
export declare function tenantSchema(tenantId: string): string;
/**
 * Phase I-3: create the tenant schema AND grant the migrator + verifier roles
 * the privileges they need to run per-tenant migrations and read-only audit
 * queries against the schema. This prevents the privilege drift that was
 * caught during the initial Phase E + F-4 rollout (tenant_shahin_visitors
 * was owned by dos_auth and refused dos_migrator's CREATE), where the
 * orchestrator failed on a single tenant because no central code path
 * granted the migrator role on freshly-created schemas.
 *
 * Idempotent: safe to call repeatedly; CREATE SCHEMA IF NOT EXISTS plus
 * GRANT OPTION-style GRANT statements both no-op on subsequent runs.
 *
 * Roles granted (override via env if a deployment uses different names):
 *   - DOS_MIGRATOR_ROLE  (default 'dos_migrator')   USAGE + CREATE
 *   - DOS_VERIFIER_ROLE  (default 'dos_verifier')   USAGE
 *
 * @param tenantId  The validated tenant identifier.
 * @param query     A QueryFn (typically `safeQuery` from this package)
 *                  passed by the caller — keeps this module dependency-free.
 */
export type CreateSchemaQueryFn = (text: string, params?: unknown[]) => Promise<unknown>;
export declare function createTenantSchemaWithGrants(tenantId: string, query: CreateSchemaQueryFn): Promise<string>;
/**
 * Phase I-3: idempotent role grants on a tenant schema. Call this from
 * legacy code paths that already derived the schema name and just need
 * the grants applied. Validates the schema name against the same regex
 * `tenantSchema()` enforces, then issues:
 *   - GRANT USAGE, CREATE ON SCHEMA  → migrator role
 *   - GRANT USAGE ON SCHEMA          → verifier role
 *   - ALTER DEFAULT PRIVILEGES SELECT → verifier role (tables + sequences)
 *
 * The role names come from env (DOS_MIGRATOR_ROLE / DOS_VERIFIER_ROLE) and
 * are whitelisted to prevent identifier injection.
 */
export declare function grantTenantSchemaPrivileges(schema: string, query: CreateSchemaQueryFn): Promise<void>;
export declare function tenantScopedQuery(tenantId: string, userId: string, text: string, params?: unknown[]): Promise<import("pg").QueryResult<any>>;
export type ActorPrincipalType = 'human' | 'agent' | 'service_account' | 'external';
export interface ActorContext {
    principalType: ActorPrincipalType;
    actorId?: string;
    userId?: string;
}
export declare function getTenantClient(tenantId: string, actorContext?: ActorContext): Promise<PoolClient>;
export declare function withTenantClient<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T>;
export declare function withTenantClient<T>(tenantId: string, actorContext: ActorContext, fn: (client: PoolClient) => Promise<T>): Promise<T>;
