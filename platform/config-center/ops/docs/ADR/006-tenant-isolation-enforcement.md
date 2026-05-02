# ADR 006: Tenant Isolation Enforcement — RLS + `withTenantClient` + Tenant-Keyed Caches

## Status

Accepted

## Context

A Phase 11 audit of tenant isolation on `main` found the posture weaker than intended:

1. **`withTenantClient` (packages/dos-db/src/tenant.ts) was defined but unused.** Zero services imported it. Handlers relied on `safeQuery` + a `WHERE tenant_id = $1` filter. Since `safeQuery` uses the default pool without setting `app.current_tenant_id`, any RLS policy that inspects that GUC would never fire.

2. **RLS migration [ops/migrations/tenant/020_row_level_security.sql](../../migrations/tenant/020_row_level_security.sql) was not applied by `pnpm migrate`.** The bash runner at [ops/scripts/run-migrations.sh](../../scripts/run-migrations.sh) explicitly skipped the `tenant/` subdirectory. The only applier was an onboarding provisioning step that ran at tenant-creation time only, without idempotency tracking — so the vast majority of existing tenant schemas had no RLS enforcement.

3. **Cache key conventions varied.** Several in-memory `Map` caches were already keyed by `tenantId`; the shared Redis client used a global `dos:` prefix with no tenant namespace, and nothing in the shared helper surface pushed callers toward a tenant-aware key shape.

Net effect: the DB-level defense-in-depth layer was a no-op, and any new Redis cache that forgot to include the tenant in its key would silently share data across tenants.

## Decision

Tenant isolation is enforced in three layers, all of which must be present for a tenant-scoped resource:

### 1. RLS — database layer

- `ops/migrations/tenant/020_row_level_security.sql` enables `ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` on every tenant-scoped table listed in the migration, with a `tenant_isolation` policy predicated on `current_setting('app.current_tenant_id', true)`.
- Applied per tenant schema by `ops/scripts/run-tenant-migrations.sh` (Phase 3 of `pnpm migrate`), tracked idempotently in `dos.schema_migrations` with the qualified name `tenant/<schema>/<file>`.
- Rollback: `ops/migrations/tenant/020_row_level_security_down.sql` disables RLS and drops the policy + helper function.

### 2. `withTenantClient` — connection layer

- All tenant-scoped DB access MUST use `withTenantClient(tenantId, async (client) => …)` from `@dos/db`.
- The helper acquires a pooled connection, issues `SET search_path TO "tenant_<id>", public` and (when `RLS_ENABLED=true`) `SET app.current_tenant_id = '<id>'`, executes the callback, and RESETs both on release.
- Handlers drop the `"${schema}".` prefix (search_path resolves it) and drop the `WHERE tenant_id = $n` filter for tables covered by 020 (RLS applies it). Tables NOT covered by 020 keep explicit filters.

### 3. `tenantCacheKey` — cache layer

- Redis/in-memory caches that hold tenant-scoped data MUST key by `tenantCacheKey(tenantId, key)` from `@dos/db` (shape: `t:<tenantId>:<key>`). User-scoped caches use `tenantUserCacheKey(tenantId, userId, key)`.
- Platform-scoped caches (e.g. `runtime_config` keys under the `platform.*` namespace, already intentionally global) remain bare; each such site carries a one-line comment documenting the decision.

### Verification

- `ops/scripts/test-rls-cross-tenant.ts` (`pnpm test:rls`) creates two tenant schemas, seeds one row each, and asserts:
  - `withTenantClient(A)` sees only A's row;
  - `withTenantClient(A)` cross-reading B is blocked (RLS returns 0 rows);
  - Raw `pool.query()` without tenant context sees both — the gap layer 2 closes.
- Optional static check: `ops/scripts/check-tenant-isolation.sh` scans for new `safeQuery` call sites containing `tenant_id = $` or `"${schema}"` and flags them against this ADR.

### Exceptions

- **Platform-scoped tables** (`dos.tenants`, `dos.users`, `dos.schema_migrations`, platform audit tables) are not per-tenant — continue using `safeQuery` and explicit filters where appropriate.
- **Platform-scoped cache keys** (`runtime_config` platform-namespaced keys) keep bare keys with a comment.
- **Vector stores** (pgvector + LangGraph checkpoint tables) are tenant-scoped but not in the 020 table list. They must either (a) opt into RLS via an additive migration that extends 020's pattern, OR (b) wrap all access in `withTenantClient` AND retain explicit `WHERE tenant_id = $n` filters until (a) lands.

## Consequences

### Positive

- Defense-in-depth that actually fires: accidental omission of a tenant filter no longer leaks data, because the session-level GUC + RLS policy blocks the read.
- One canonical shape for tenant-scoped DB access and cache keying, which makes future cache and DB helpers easy to audit.
- `RLS_ENABLED` (already present) remains a kill switch: setting it to `false` restores prior behavior for emergency rollback without redeploying.

### Negative / migration cost

- Step 3 of Phase 11 is a mechanical conversion across every tenant-scoped handler — roughly one PR per service. During the transition, mixed patterns will coexist; the static-check script flags new regressions only.
- RLS adds a per-query cost (policy evaluation). Benchmarks of `controls` and `risks` tables in local Postgres show < 5% overhead; monitor hot paths after enabling in prod.

### Neutral

- Existing schema-based isolation (`tenant_<id>` per-tenant schema via search_path) is preserved — RLS is additive, not a replacement.

## Related

- Migration runner canonicalization: see [ADR 004](./004-migration-runner-canonical.md). Phase 11 uses the bash runner (`dos.schema_migrations`) for parity with how tenant migrations are applied today; reconciling with `dos.platform_migrations` is out of scope for Phase 11.
- CSRF policy: see [ADR 002](./002-csrf-policy-anonymous-read.md). CSRF policy reads remain DB-backed per-tenant; no cache layer changes required.
