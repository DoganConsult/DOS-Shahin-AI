# Tenant Isolation Pattern

**Wave 1 reference doc.** Describes the canonical tenant-isolation pattern compliance follows, why it passes the platform gate, and how to add new code without regressing.

---

## TL;DR

The platform's `ops/scripts/check-tenant-isolation.sh` reports **0 violations in `modules/compliance/`** as of Wave 0 (2026-04-30). The gate enforces:

1. No `safeQuery(\`...${schema}...\`)` — raw template-string schema interpolation.
2. No unrendered `__TENANT_SCHEMA__` placeholder.

Compliance's pattern uses `withTenantClient(tenantId, async (client) => {...})` at the route layer; services accept the resolved `client: DbClient` and call `client.query(SQL, params)` with parameterized SQL. Schema is set via `search_path` inside `withTenantClient`, not interpolated into SQL.

This is the canonical pattern. **Do not deviate.**

---

## The shape of a service method

```ts
// application/<resource>/<resource>.service.ts
import type { DbClient } from '../../db/runner';

export async function listResource(client: DbClient, filters: Filters): Promise<Resource[]> {
  const result = await client.query<Resource>(
    `SELECT id, name, status, created_at
       FROM compliance_resources
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY created_at DESC
      LIMIT 50`,
    [filters.status ?? null],
  );
  return result.rows;
}
```

Note:
- **No** schema name in SQL. The `search_path` is set by `withTenantClient` before this runs.
- **All** dynamic values pass through `$N` parameters.
- **Service does not know the tenant_id**; only the caller (route handler) does.

## The shape of a route handler

```ts
// interface/http/<resource>.routes.ts
import { Router } from 'express';
import { withTenantClient } from '@dos/db';   // or '../../db/runner'
import { validate, requirePermission } from '../ports/middleware.port';
import { listResource } from '../../application/<resource>/<resource>.service';
import { listQuerySchema } from '../../schemas/<resource>.schemas';

const router = Router();

router.get('/',
  requirePermission('resource.read'),
  validate({ query: listQuerySchema }),
  async (req, res) => {
    const tenantId = req.tenantId!;     // set by upstream auth middleware
    const items = await withTenantClient(tenantId, (client) =>
      listResource(client, req.query as any),
    );
    res.json({ data: items });
  },
);
```

The route handler is the **only** place tenant_id appears. The service is tenant-agnostic by design — it operates on whatever schema the client points at.

## What about `withTenantClient` itself?

Defined in the platform db layer (`@dos/db` workspace package). Sketch:

```ts
// platform/db/with-tenant-client.ts
export async function withTenantClient<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  // 1. Resolve tenant schema name from tenant id (cached lookup).
  const schema = await resolveTenantSchema(tenantId);

  // 2. Acquire pooled connection.
  const client = await pool.connect();
  try {
    // 3. Set search_path for this connection. SAFE because schema name is
    //    validated against /^tenant_[A-Za-z0-9_]+$/ before interpolation,
    //    and we use SET LOCAL inside a transaction so it doesn't leak.
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path TO "${schema}", dos, public`);
    // 4. Run the user's function with the prepared client.
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
```

This wrapper is the **only** place schema-name interpolation happens, and it's guarded by:
- regex validation of the schema name
- SET LOCAL (auto-released at COMMIT/ROLLBACK)
- pooled connection release

## Why the audit said "74 services use raw client.query"

The Wave-0 explore agent counted any file calling `client.query(...)` and labeled it tenant-leakage risk. **That's wrong.** Those calls are inside `withTenantClient`-wrapped scopes; the `client` parameter is already tenant-scoped. The pattern is correct.

The platform gate (`check-tenant-isolation.sh`) does not flag these because they don't match the violation patterns:
- They don't use `safeQuery(\`...${schema}...\`)`.
- They don't have `__TENANT_SCHEMA__` placeholders.

## Anti-patterns to reject in code review

```ts
// BAD — direct schema interpolation
await safeQuery(`SELECT * FROM "${schema}".controls WHERE id = $1`, [id]);
//                          ^^^^^^^^ flagged by gate
```

```ts
// BAD — unrendered placeholder
await safeQuery(`SELECT * FROM __TENANT_SCHEMA__.controls`, []);
//                            ^^^^^^^^^^^^^^^^^ flagged by gate
```

```ts
// BAD — service knows tenantId, runs raw SQL itself
async function listControls(tenantId: string): Promise<Control[]> {
  const schema = `tenant_${tenantId}`;  // service should not know schema
  const r = await pool.query(`SELECT * FROM "${schema}".controls`);
  return r.rows;
}
```

```ts
// BAD — route forgets to wrap; uses bare pool
router.get('/', async (req, res) => {
  const r = await pool.query('SELECT * FROM controls');  // wrong schema!
  res.json(r.rows);
});
```

## Acceptable extensions

```ts
// OK — explicit tenant-aware port for cross-tenant aggregations (e.g. NOC)
import { adminPool } from '@dos/db/admin';
async function adminPlatformStats(): Promise<Stats> {
  // Admin code. Reads dos.* (cross-tenant) only. Never reads tenant.*.
  const r = await adminPool.query('SELECT count(*) FROM dos.tenants WHERE status = $1', ['active']);
  return { activeTenants: r.rows[0].count };
}
```

```ts
// OK — public schema (cross-tenant reference data) inside a tenant client
async function listFrameworks(client: DbClient): Promise<Framework[]> {
  // Frameworks live in dos.frameworks (public reference). The client's
  // search_path includes 'dos', so this just works.
  const r = await client.query('SELECT * FROM frameworks');
  return r.rows;
}
```

## How to add a new endpoint

1. Add route handler that calls `withTenantClient(req.tenantId!, fn)`.
2. Add service function that takes `client: DbClient` (no `tenantId` parameter).
3. Use parameterized SQL only — never interpolate values.
4. Schema name never appears in your SQL — `search_path` is set for you.
5. Add Zod schema to `schemas/<resource>.schemas.ts`.
6. Add `validate({ body, params, query })` middleware to the route.
7. Add `requirePermission('compliance.<resource>.<action>')`.
8. Run `bash ops/scripts/check-tenant-isolation.sh` — must report 0 new violations.
9. Run `npm run test:contract` — Zod coverage ratchet (Wave 2) must not regress.

## Regression detection

`tests/contract/compliance.contract.test.mjs` includes a tenant-isolation regression test (Wave 1):
- Greps `application/`, `infrastructure/`, `interface/` for the violation patterns.
- Test fails on any new occurrence.
- Update of the `KNOWN_GATE_EXCEPTIONS` array required (with reviewer comment) to add allowlist entries.

---

**Last revised**: 2026-04-30 (Wave 1 — initial issue).
**Owner**: product-shahin-ai + platform-sec.
