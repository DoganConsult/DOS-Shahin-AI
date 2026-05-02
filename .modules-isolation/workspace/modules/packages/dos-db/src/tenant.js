"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTenantId = assertTenantId;
exports.tenantSchema = tenantSchema;
exports.createTenantSchemaWithGrants = createTenantSchemaWithGrants;
exports.grantTenantSchemaPrivileges = grantTenantSchemaPrivileges;
exports.tenantScopedQuery = tenantScopedQuery;
exports.getTenantClient = getTenantClient;
exports.withTenantClient = withTenantClient;
const pool_1 = require("./pool");
const logger_1 = require("./logger");
const errors_1 = require("./errors");
/**
 * Tenant identifier allowlist.
 *
 * Phase 2 tenant-safety hardening:
 *  - lowercase letters, digits, hyphen, underscore only
 *  - length 1..64
 *  - no leading or trailing hyphen
 *  - no uppercase, no whitespace, no quotes, no control chars, no unicode
 *
 * Any deviation is rejected BEFORE any SQL is constructed. The tenant
 * schema name is derived by prefixing `tenant_`, so the invariant is
 * enforced at the identifier level, not at the SQL-quote level.
 */
const TENANT_ID_REGEX = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
/**
 * Tenant schema name invariant: must start with `tenant_` and contain only
 * lowercase allowlisted characters. The prefix is enforced so identifiers
 * cannot escape into the platform `dos` / `public` namespaces.
 */
const TENANT_SCHEMA_REGEX = /^tenant_[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
function assertTenantId(tenantId) {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
        throw Object.assign(new Error('Tenant context required'), { statusCode: 400, code: 'MISSING_TENANT' });
    }
    if (!TENANT_ID_REGEX.test(tenantId)) {
        throw Object.assign(new Error('Invalid tenant ID format'), { statusCode: 400, code: 'INVALID_TENANT_ID' });
    }
}
function tenantSchema(tenantId) {
    // Validate raw input before deriving the schema name.
    assertTenantId(tenantId);
    // Canonical naming convention (platform SoT — see memory
    // "DB Architecture 2026-04-20" and platform/dos/migrations/public/
    // 20260424_0100_foundation_zero_blocker.sql §5): schema name is
    // `tenant_<identifier-safe-hex>` with every non-alphanumeric stripped
    // from the tenant id. UUID tenant ids such as
    // `ab8e7cb6-e905-4a63-bac0-e4a5e6c453ee` therefore produce
    // `tenant_ab8e7cb6e9054a63bac0e4a5e6c453ee`. This matches
    // `@dos/module-sdk`'s tenantSchema() so every caller resolves to the
    // same physical schema regardless of which helper they imported. The
    // prior behaviour kept hyphens in the schema name, causing any
    // consumer that routed through `@dos/db` (e.g. workflow-service's
    // approval-requests routes) to query a non-existent schema and hang
    // until the connection pool's acquire timeout fired.
    const normalized = tenantId.replace(/[^a-zA-Z0-9_]/g, '');
    const schema = `tenant_${normalized}`;
    // Defence-in-depth: verify the derived schema still matches the strict
    // invariant. Rejects any input that slipped past assertTenantId for any
    // reason (future regex regressions, prototype tricks, etc.).
    if (!TENANT_SCHEMA_REGEX.test(schema)) {
        throw Object.assign(new Error('Invalid tenant schema derived'), { statusCode: 400, code: 'INVALID_TENANT_SCHEMA' });
    }
    return schema;
}
async function createTenantSchemaWithGrants(tenantId, query) {
    const schema = tenantSchema(tenantId);
    await query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await grantTenantSchemaPrivileges(schema, query);
    return schema;
}
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
async function grantTenantSchemaPrivileges(schema, query) {
    if (!TENANT_SCHEMA_REGEX.test(schema)) {
        throw Object.assign(new Error(`Invalid tenant schema "${schema}"`), { code: 'INVALID_TENANT_SCHEMA' });
    }
    const migratorRole = (process.env.DOS_MIGRATOR_ROLE ?? 'dos_migrator').trim();
    const verifierRole = (process.env.DOS_VERIFIER_ROLE ?? 'dos_verifier').trim();
    // Whitelist role names the same way we whitelist tenant ids: only
    // [a-z0-9_], length ≤64. Anything else is rejected to prevent identifier
    // injection into the GRANT statement.
    const ROLE_REGEX = /^[a-z][a-z0-9_]{0,63}$/;
    for (const role of [migratorRole, verifierRole]) {
        if (!ROLE_REGEX.test(role)) {
            throw Object.assign(new Error(`Invalid role name "${role}"; must match /^[a-z][a-z0-9_]{0,63}$/`), { code: 'INVALID_ROLE_NAME' });
        }
    }
    // GRANT to migrator (full DDL on the schema's namespace).
    await query(`GRANT USAGE, CREATE ON SCHEMA "${schema}" TO "${migratorRole}"`);
    // GRANT to verifier (read the schema namespace + future objects).
    await query(`GRANT USAGE ON SCHEMA "${schema}" TO "${verifierRole}"`);
    // Default privileges for any objects created LATER inside this schema.
    // Without this, the migrator role can create objects but the verifier
    // can't SELECT from them. ALTER DEFAULT PRIVILEGES is also idempotent.
    await query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}"
       GRANT SELECT ON TABLES TO "${verifierRole}"`);
    await query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}"
       GRANT SELECT ON SEQUENCES TO "${verifierRole}"`);
}
/**
 * Assert the caller-supplied user ID is a safe, non-empty string. No SQL
 * construction happens here — callers pass userId to `set_config($1, true)`
 * parameterised — but reject obvious garbage early so the GUC carries only
 * trustworthy values.
 */
function assertUserId(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw Object.assign(new Error('User context required'), { statusCode: 400, code: 'MISSING_USER' });
    }
    if (userId.length > 256) {
        throw Object.assign(new Error('User ID too long'), { statusCode: 400, code: 'INVALID_USER_ID' });
    }
}
async function tenantScopedQuery(tenantId, userId, text, params) {
    assertTenantId(tenantId);
    assertUserId(userId);
    const pool = (0, pool_1.getPool)();
    const client = await pool.connect();
    try {
        if (process.env.RLS_ENABLED === 'true') {
            // Parameterised via set_config — the third arg `true` scopes to the
            // current transaction (equivalent to SET LOCAL), so the GUC is
            // cleared automatically at commit/rollback. No SQL interpolation.
            await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
            await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
        }
        return await client.query(text, params);
    }
    finally {
        client.release();
    }
}
const PRINCIPAL_TYPE_ALLOW = new Set([
    'human',
    'agent',
    'service_account',
    'external',
]);
function assertActorContext(ctx) {
    if (!ctx)
        return;
    if (!PRINCIPAL_TYPE_ALLOW.has(ctx.principalType)) {
        throw Object.assign(new Error('Invalid principal type'), {
            statusCode: 400,
            code: 'INVALID_PRINCIPAL_TYPE',
        });
    }
    if (ctx.actorId !== undefined && (typeof ctx.actorId !== 'string' || ctx.actorId.length > 256)) {
        throw Object.assign(new Error('Invalid actor ID'), {
            statusCode: 400,
            code: 'INVALID_ACTOR_ID',
        });
    }
    if (ctx.userId !== undefined && (typeof ctx.userId !== 'string' || ctx.userId.length > 256)) {
        throw Object.assign(new Error('Invalid user ID'), {
            statusCode: 400,
            code: 'INVALID_USER_ID',
        });
    }
}
async function getTenantClient(tenantId, actorContext) {
    // tenantSchema already calls assertTenantId and verifies the derived name.
    const schema = tenantSchema(tenantId);
    assertActorContext(actorContext);
    const pool = (0, pool_1.getPool)();
    const client = await pool.connect();
    try {
        // Postgres rejects parameter placeholders in SET search_path, so the
        // identifier must appear literally. Safety is enforced by the upstream
        // regex (TENANT_SCHEMA_REGEX) — no quotes, no dots, no whitespace can
        // appear in `schema`. The surrounding double-quotes treat it as a
        // quoted identifier; any escape attempt would have already been rejected.
        await client.query(`SET search_path TO "${schema}", public`);
        if (process.env.RLS_ENABLED === 'true') {
            // Parameterised via set_config — session scope (`false`) matches the
            // prior SET behaviour; cleared explicitly in withTenantClient's finally.
            await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
            if (actorContext) {
                await client.query(`SELECT set_config('app.principal_type', $1, false)`, [actorContext.principalType]);
                if (actorContext.actorId) {
                    await client.query(`SELECT set_config('app.actor_id', $1, false)`, [actorContext.actorId]);
                }
                if (actorContext.userId) {
                    await client.query(`SELECT set_config('app.current_user_id', $1, false)`, [actorContext.userId]);
                }
            }
        }
        return client;
    }
    catch (err) {
        client.release();
        throw err;
    }
}
async function withTenantClient(tenantId, fnOrActorContext, maybeFn) {
    const logger = (0, logger_1.getDbLogger)();
    const actorContext = typeof fnOrActorContext === 'function' ? undefined : fnOrActorContext;
    const fn = typeof fnOrActorContext === 'function'
        ? fnOrActorContext
        : maybeFn;
    if (typeof fn !== 'function') {
        throw new Error('withTenantClient: callback function is required');
    }
    const client = await getTenantClient(tenantId, actorContext);
    try {
        return await fn(client);
    }
    finally {
        await client.query('RESET search_path').catch((err) => {
            logger.warn({ error: (0, errors_1.toErrorMessage)(err), tenantId }, '[DB] RESET search_path failed on tenant client release');
        });
        if (process.env.RLS_ENABLED === 'true') {
            // Clear the session-scoped GUCs. Using set_config(name, null, false)
            // per Postgres convention resets to default; parameterised for safety.
            const clears = [
                client.query(`SELECT set_config('app.current_tenant_id', NULL, false)`),
            ];
            if (actorContext) {
                clears.push(client.query(`SELECT set_config('app.principal_type', NULL, false)`));
                if (actorContext.actorId) {
                    clears.push(client.query(`SELECT set_config('app.actor_id', NULL, false)`));
                }
                if (actorContext.userId) {
                    clears.push(client.query(`SELECT set_config('app.current_user_id', NULL, false)`));
                }
            }
            await Promise.all(clears.map((p) => p.catch((err) => {
                logger.warn({ error: (0, errors_1.toErrorMessage)(err), tenantId }, '[DB] clear session GUC failed on tenant client release');
            })));
        }
        client.release();
    }
}
//# sourceMappingURL=tenant.js.map