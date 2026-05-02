import { PoolClient } from 'pg';
import { getPool } from './pool';
import { getDbLogger } from './logger';
import { toErrorMessage } from './errors';

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

export function assertTenantId(tenantId: unknown): asserts tenantId is string {
  if (!tenantId || typeof tenantId !== 'string' || (tenantId as string).trim() === '') {
    throw Object.assign(new Error('Tenant context required'), { statusCode: 400, code: 'MISSING_TENANT' });
  }
  if (!TENANT_ID_REGEX.test(tenantId as string)) {
    throw Object.assign(
      new Error('Invalid tenant ID format'),
      { statusCode: 400, code: 'INVALID_TENANT_ID' }
    );
  }
}

export function tenantSchema(tenantId: string): string {
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
    throw Object.assign(
      new Error('Invalid tenant schema derived'),
      { statusCode: 400, code: 'INVALID_TENANT_SCHEMA' }
    );
  }
  return schema;
}

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

export async function createTenantSchemaWithGrants(
  tenantId: string,
  query: CreateSchemaQueryFn,
): Promise<string> {
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
export async function grantTenantSchemaPrivileges(
  schema: string,
  query: CreateSchemaQueryFn,
): Promise<void> {
  if (!TENANT_SCHEMA_REGEX.test(schema)) {
    throw Object.assign(
      new Error(`Invalid tenant schema "${schema}"`),
      { code: 'INVALID_TENANT_SCHEMA' },
    );
  }

  const migratorRole = (process.env.DOS_MIGRATOR_ROLE ?? 'dos_migrator').trim();
  const verifierRole = (process.env.DOS_VERIFIER_ROLE ?? 'dos_verifier').trim();

  // Whitelist role names the same way we whitelist tenant ids: only
  // [a-z0-9_], length ≤64. Anything else is rejected to prevent identifier
  // injection into the GRANT statement.
  const ROLE_REGEX = /^[a-z][a-z0-9_]{0,63}$/;
  for (const role of [migratorRole, verifierRole]) {
    if (!ROLE_REGEX.test(role)) {
      throw Object.assign(
        new Error(`Invalid role name "${role}"; must match /^[a-z][a-z0-9_]{0,63}$/`),
        { code: 'INVALID_ROLE_NAME' },
      );
    }
  }

  // GRANT to migrator (full DDL on the schema's namespace).
  await query(`GRANT USAGE, CREATE ON SCHEMA "${schema}" TO "${migratorRole}"`);
  // GRANT to verifier (read the schema namespace + future objects).
  await query(`GRANT USAGE ON SCHEMA "${schema}" TO "${verifierRole}"`);

  // Default privileges for any objects created LATER inside this schema.
  // Without this, the migrator role can create objects but the verifier
  // can't SELECT from them. ALTER DEFAULT PRIVILEGES is also idempotent.
  await query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}"
       GRANT SELECT ON TABLES TO "${verifierRole}"`,
  );
  await query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}"
       GRANT SELECT ON SEQUENCES TO "${verifierRole}"`,
  );
}

/**
 * Assert the caller-supplied user ID is a safe, non-empty string. No SQL
 * construction happens here — callers pass userId to `set_config($1, true)`
 * parameterised — but reject obvious garbage early so the GUC carries only
 * trustworthy values.
 */
function assertUserId(userId: unknown): asserts userId is string {
  if (!userId || typeof userId !== 'string' || (userId as string).trim() === '') {
    throw Object.assign(new Error('User context required'), { statusCode: 400, code: 'MISSING_USER' });
  }
  if ((userId as string).length > 256) {
    throw Object.assign(new Error('User ID too long'), { statusCode: 400, code: 'INVALID_USER_ID' });
  }
}

export async function tenantScopedQuery(
  tenantId: string,
  userId: string,
  text: string,
  params?: unknown[],
) {
  assertTenantId(tenantId);
  assertUserId(userId);
  const pool = getPool();
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
  } finally {
    client.release();
  }
}

export type ActorPrincipalType = 'human' | 'agent' | 'service_account' | 'external';

export interface ActorContext {
  principalType: ActorPrincipalType;
  actorId?: string;
  userId?: string;
}

const PRINCIPAL_TYPE_ALLOW: ReadonlySet<ActorPrincipalType> = new Set([
  'human',
  'agent',
  'service_account',
  'external',
]);

function assertActorContext(ctx: ActorContext | undefined): void {
  if (!ctx) return;
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

export async function getTenantClient(
  tenantId: string,
  actorContext?: ActorContext,
): Promise<PoolClient> {
  // tenantSchema already calls assertTenantId and verifies the derived name.
  const schema = tenantSchema(tenantId);
  assertActorContext(actorContext);
  const pool = getPool();
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
        await client.query(
          `SELECT set_config('app.principal_type', $1, false)`,
          [actorContext.principalType],
        );
        if (actorContext.actorId) {
          await client.query(
            `SELECT set_config('app.actor_id', $1, false)`,
            [actorContext.actorId],
          );
        }
        if (actorContext.userId) {
          await client.query(
            `SELECT set_config('app.current_user_id', $1, false)`,
            [actorContext.userId],
          );
        }
      }
    }
    return client;
  } catch (err) {
    client.release();
    throw err;
  }
}

export async function withTenantClient<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T>;
export async function withTenantClient<T>(
  tenantId: string,
  actorContext: ActorContext,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T>;
export async function withTenantClient<T>(
  tenantId: string,
  fnOrActorContext: ActorContext | ((client: PoolClient) => Promise<T>),
  maybeFn?: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const logger = getDbLogger();
  const actorContext: ActorContext | undefined =
    typeof fnOrActorContext === 'function' ? undefined : fnOrActorContext;
  const fn: (client: PoolClient) => Promise<T> =
    typeof fnOrActorContext === 'function'
      ? fnOrActorContext
      : (maybeFn as (client: PoolClient) => Promise<T>);
  if (typeof fn !== 'function') {
    throw new Error('withTenantClient: callback function is required');
  }
  const client = await getTenantClient(tenantId, actorContext);
  try {
    return await fn(client);
  } finally {
    await client.query('RESET search_path').catch((err: unknown) => {
      logger.warn({ error: toErrorMessage(err), tenantId }, '[DB] RESET search_path failed on tenant client release');
    });
    if (process.env.RLS_ENABLED === 'true') {
      // Clear the session-scoped GUCs. Using set_config(name, null, false)
      // per Postgres convention resets to default; parameterised for safety.
      const clears: Array<Promise<unknown>> = [
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
      await Promise.all(
        clears.map((p) =>
          p.catch((err: unknown) => {
            logger.warn(
              { error: toErrorMessage(err), tenantId },
              '[DB] clear session GUC failed on tenant client release',
            );
          }),
        ),
      );
    }
    client.release();
  }
}
