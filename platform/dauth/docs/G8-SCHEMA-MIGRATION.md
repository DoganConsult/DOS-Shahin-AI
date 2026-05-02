# G8 — DAuth Schema Isolation Plan

**Goal:** every DAuth-owned table lives in a dedicated `platform_dauth.*`
schema, not in the shared `dos.*` / `public.*` schemas.

---

## Phase 1 — views layer (DELIVERED, non-destructive)

- Migration `platform/dauth/migrations/public/20260422_0005_create_platform_dauth_schema.sql`
  creates `platform_dauth` and 35 views — one per DAuth-owned table.
- Views are idempotent (`CREATE OR REPLACE`) and non-destructive.
- Every view mirrors the underlying table exactly (`SELECT *`).
- Collision-suffixed views (`sessions_dos`, `access_profiles_public`,
  `user_access_profiles_dos`) address tables that exist under both `dos.*`
  and `public.*` with the same name.
- `platform/dauth/module.manifest.json#metadata.schemas.dedicated` declares the
  dedicated schema name and the isolation phase. (Phase 3.5, 2026-04-29: the
  manifest moved from `platform/dauth/manifest/platform-module.manifest.json`
  to the canonical v1 path above; rich metadata is preserved verbatim under
  `metadata.*`. The legacy file is archived under `_quarantine/legacy-manifests/dauth/`.)
- `migrations-index.json` tracks the migration.
- Validated by `platform/dauth/migrations/__tests__/platform-dauth-schema.test.ts` (7/7 green).

---

## Phase 2a — code migration (DELIVERED)

All DAuth TypeScript code now addresses owned tables through
`platform_dauth.*`. While the underlying data still lives in `dos.*` /
`public.*`, queries are served by the Phase-1 views. No behavior change.

Mechanical rewrite results (45 call-sites across 13 files):

| Legacy reference | New reference |
|---|---|
| `dos.authz_decision_log` (31) | `platform_dauth.authz_decision_log` |
| `dos.functional_roles` (1) | `platform_dauth.functional_roles` |
| `dos.permissions` (1) | `platform_dauth.permissions` |
| `public.active_sessions` (2) | `platform_dauth.active_sessions` |
| `public.sessions` (10) | `platform_dauth.sessions` |

Regression protection:
`platform/dauth/migrations/__tests__/schema-references.test.ts` greps
the DAuth source tree and fails CI if *any* direct `dos.<dauth_table>`
or `public.<dauth_table>` reference reappears (36 per-table assertions
+ a sanity check that `platform_dauth.*` is present; 36/36 green).

Out-of-scope for Phase 2a:
- Unqualified table references (`FROM sessions`, `FROM users`, etc.)
  are left unchanged — they resolve through `search_path` and will
  continue to resolve to `public.*` until Phase 2b moves data. If the
  Phase 2b cutover reorders `search_path` to include `platform_dauth`
  first, these refs keep working.
- SQL migration files are left unchanged — they create the underlying
  `dos.*` / `public.*` tables that the views expose.

---

## External consumers reaching into DAuth tables (INVENTORY)

These are architectural violations (other modules/services should call
DAuthPort, not query DAuth data directly). They are NOT in Phase 2a
scope — each belongs to its own consumer-cleanup PR. Phase 2b provides
a compat-view strategy so these consumers keep working during migration.

### TypeScript query sites (7 files)

| Consumer | Tables referenced |
|---|---|
| `services/tenant-service/src/domain/routes/platform-admin.routes.ts` | `dos.functional_roles`, `dos.permissions`, `dos.sod_rules`, `dos.delegations`, `dos.access_profiles` |
| `services/tenant-service/src/domain/routes/module-config.routes.ts` | `dos.permissions` |
| `services/user-service/src/domain/role.service.ts` | `dos.functional_roles` |
| `services/user-service/src/domain/foundation/sod-check.service.ts` | `dos.sod_rules` |
| `services/user-service/src/domain/foundation/delegation.service.ts` | `dos.delegations` |
| `services/onboarding-service/src/application/register-tenant-user.ts` | `public.sessions`, `public.refresh_token_families` |
| `services/onboarding-service/src/services/handoff-invitations.service.ts` | `public.invitations` |

### Metadata / registry declarations (NOT queries)

| File | Notes |
|---|---|
| `packages/dos-platform-core/src/security/data-classification-registry.ts` | Declares classifications for DAuth tables. Requires table-name update only, no SQL change. |
| `modules/compliance`, `modules/evidence`, `modules/onboarding` all ship an `admin/services/enterprise-authz.service.ts` that references `dos.user_role_assignments`. | Duplicated authz-lookup helpers — should be consolidated into a DAuthPort call. |

### SQL migrations FK-ing DAuth tables

- `modules/platform-core/db/_frozen/ops/migrations/expected-schema.sql` (frozen historical, no action)
- `modules/platform-core/db/public/migrations/006_missing_admin_tables.sql`
- `modules/platform-core/db/public/migrations/003b_platform_admin_tables.sql`

---

## Phase 2b — physical cutover (DEFERRED, requires live DB)

Why deferred: `ALTER TABLE ... SET SCHEMA` must run on a live DB and be
verified end-to-end. This session has no DB. Phase 2a leaves the code
ready — Phase 2b is a single migration + cutover ritual when a DB is
available.

Cutover steps:

1. **Move every DAuth-owned table into `platform_dauth`:**
   ```sql
   BEGIN;
   -- for every table NOT in a collision position:
   ALTER TABLE dos.authz_decision_log SET SCHEMA platform_dauth;
   ALTER TABLE dos.functional_roles   SET SCHEMA platform_dauth;
   -- ... (22 dos.*  tables total)
   ALTER TABLE public.active_sessions SET SCHEMA platform_dauth;
   -- ... (13 public.*  tables, except the 3 collisions)
   COMMIT;
   ```

2. **Resolve the collisions** (`sessions`, `access_profiles`,
   `user_access_profiles` exist in BOTH `dos` and `public`). For each
   collision, decide which table is canonical (prefer the `public.*`
   variant since it's the one DAuth code today relies on; most dos.*
   duplicates are legacy). Rename the other:
   ```sql
   ALTER TABLE dos.sessions RENAME TO sessions_legacy;
   ALTER TABLE dos.sessions_legacy SET SCHEMA platform_dauth;
   ALTER TABLE public.sessions SET SCHEMA platform_dauth;
   ```

3. **Compat-layer for external consumers** — instead of breaking the 7
   external TS sites listed above, create REVERSE views so they
   continue to work while their owners migrate:
   ```sql
   CREATE OR REPLACE VIEW dos.functional_roles AS SELECT * FROM platform_dauth.functional_roles;
   CREATE OR REPLACE VIEW dos.permissions      AS SELECT * FROM platform_dauth.permissions;
   CREATE OR REPLACE VIEW dos.sod_rules        AS SELECT * FROM platform_dauth.sod_rules;
   CREATE OR REPLACE VIEW dos.delegations      AS SELECT * FROM platform_dauth.delegations;
   CREATE OR REPLACE VIEW dos.access_profiles  AS SELECT * FROM platform_dauth.access_profiles;
   CREATE OR REPLACE VIEW public.sessions      AS SELECT * FROM platform_dauth.sessions;
   CREATE OR REPLACE VIEW public.refresh_token_families
     AS SELECT * FROM platform_dauth.refresh_token_families;
   CREATE OR REPLACE VIEW public.invitations   AS SELECT * FROM platform_dauth.invitations;
   ```
   Drop these compat views as each external consumer migrates off.

4. **Drop the Phase-1 views** (`platform_dauth.sessions`, etc. — they
   become obsolete once the underlying table IS `platform_dauth.sessions`).
   Use `CREATE OR REPLACE VIEW` idempotently to handle the view→table
   transition without explicit drops.

5. **Update FK references** in external migrations:
   ```bash
   grep -rnE "REFERENCES (dos|public)\.(sessions|user_mfa|...)" \
     modules/*/db services/*/migrations
   ```
   Rewrite to `REFERENCES platform_dauth.<table>`.

6. **Re-check `dos.platform_migrations.current_path`** consistency:
   ```bash
   pnpm exec tsx migration/migration-runner.ts status
   ```

### Rollback

Phase 1 rollback: `DROP SCHEMA IF EXISTS platform_dauth CASCADE` — views
only, no data affected. Safe.

Phase 2b rollback: each `ALTER TABLE SET SCHEMA` has a mirror in the
`_down.sql` — restores the table to its original schema and recreates
the views. Every Phase-2b migration PR must ship both directions.

---

## Verification commands (today, Phase 2a)

```bash
# 1. No DAuth code references dos.<t> / public.<t> directly.
pnpm exec vitest run platform/dauth/migrations/__tests__/schema-references.test.ts
# → 37 tests / 37 passed

# 2. platform_dauth references are present.
grep -rEc "\bplatform_dauth\." platform/dauth/packages/core/ \
  platform/dauth/packages/shared/src/ platform/dauth/services/auth-service/src/ \
  --include="*.ts" | awk -F: '{s+=$2} END {print s+0}'
# → 45

# 3. Migration tests green.
pnpm exec vitest run platform/dauth/migrations/__tests__/
# → 2 files / 43 tests / all passed

# 4. Isolation rules still green.
pnpm run verify:imports:platform | grep -c dauth-isolation
# → 0
```
