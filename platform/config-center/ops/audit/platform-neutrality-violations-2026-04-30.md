# Platform Neutrality Violations — 2026-04-30

**Constitutional law 2 (Platform Core Neutrality) + Rule #1 (4D Platform Homes):**
the `platform/` tree must be product-agnostic. No product names, no
product-specific entity types, no inline product permission strings, no
product-only catalogs. Cross-cutting platform pieces live under DOS / DAuth /
DSOC / DNOC. Product behavior lives under `modules/` (or
`packages/<product>-product/`).

This file is the Wave-B work queue. It does NOT propose code changes here;
it captures the surface area that must be moved or refactored.

## Summary by violation class

| Class | Severity | Count | Owner of fix |
|------:|---------|------:|-------------|
| Product directory under `platform/` (agrc-engine, vendor, ...) | ❌ Critical | 6 dirs | Wave B.1 — extraction PR |
| Product-name string references in `platform/` (`shahin`, `vendor`, `regulator`, ...) | ❌ Critical | 628 | follows W-B.1 |
| Inline permission strings in `platform/ai/.../agrc-engine/routes/` (e.g. `'audit.record.read'`) | ⚠️ High | many (extracted with W-B.1) | follows W-B.1 |
| Platform SQL outside `dos_migrator` registry (platform/dsoc, platform/dnoc, platform/dos/migrations) | ⚠️ High | ~30 files | Wave B.3 — migrations move PR |

## C1 — Product directories under `platform/`

These directories are full product modules that must NOT live under
`platform/`. Every file inside them is a Rule #1 violation.

| Path | Disposition |
|------|-------------|
| [platform/ai/services/ai-engine-service/src/domain/agrc-engine/](../../platform/ai/services/ai-engine-service/src/domain/agrc-engine/) | Move → `modules/agrc-engine/` (Shahin product). ~120 files. |
| [platform/ai/services/ai-engine-service/src/runtime/agrc-engine/](../../platform/ai/services/ai-engine-service/src/runtime/agrc-engine/) | Same — runtime arm of agrc-engine. |
| [platform/ai/services/ai-engine-service/src/runtime/ai/agrc-engine/](../../platform/ai/services/ai-engine-service/src/runtime/ai/agrc-engine/) | Same — nested arm. |
| [platform/ai/services/ai-engine-service/src/runtime/vendor/](../../platform/ai/services/ai-engine-service/src/runtime/vendor/) | Move → `modules/vendor/` (vendor management is a Shahin product capability). |

After moving, update [platform/ai/services/ai-engine-service/src/routes.ts:11-22](../../platform/ai/services/ai-engine-service/src/routes.ts#L11-L22) lazy-mount paths to load from new locations, and add the moved modules to the route catalog under [registries/route-catalogs/](../../registries/route-catalogs/).

## C2 — Product-name string references in `platform/`

Counts (as of 2026-04-30, excluding dist/ and node_modules/):

| Term | Hits in platform/ |
|------|------:|
| `shahin` | 399 |
| `vendor` | 208 |
| `regulator` | 21 |
| `audit_finding` | 1 |
| `consultant` | 0 |
| `policy_document` | 0 |
| `risk_register` | 0 |

Most of `shahin` / `vendor` / `regulator` lives inside the directories listed
in C1. Once C1 moves, run the same grep — anything that remains is a true
violation (e.g. inline product reference inside `platform/dauth/`,
`platform/foundation/`, `platform/dos/`, `platform/dsoc/`, `platform/dnoc/`).

```bash
# Verification post-W-B.1:
grep -rEn '\b(shahin|vendor|regulator|consultant|audit_finding|policy_document|risk_register)\b' \
  platform/ --include='*.ts' --include='*.js' --include='*.sql' --include='*.json' \
  | grep -v node_modules | grep -v dist | grep -v '/agrc-engine/' | grep -v '/vendor/'
```
**Pass condition:** zero hits.

## C3 — Inline permission strings in `platform/ai/.../agrc-engine/routes/`

`requirePermission('audit.record.read')` etc. are scattered as literals
across the agrc-engine route files. After W-B.1 moves these out of
`platform/`, the lint can be added at module-boundary scope. Until then,
these are tracked but not edited — fixing strings inside a directory that is
about to move is wasted churn.

Sample (non-exhaustive) — see explore agent (C) results for the full list:
- `platform/ai/.../agrc-engine/routes/agrc-os/dashboard-widgets.routes.ts` — `audit.record.read`, `vendor.record.read`, `policy.document.read`, `framework.record.read`
- `platform/ai/.../agrc-engine/routes/agrc-os/gates.routes.ts` — `gate.record.read`, `tenant.config.manage`
- `platform/ai/.../agrc-engine/routes/agrc-os/ccm-regulatory-orchestration.routes.ts` — `framework.record.read`, `tenant.config.manage`
- `platform/ai/.../agrc-engine/routes/agrc-os/constitution.routes.ts` — `tenant.config.manage`
- `platform/ai/.../agrc-engine/routes/agrc-os/integration.routes.ts` — `tenant.config.manage`

**Wave B.1 acceptance criterion:** after extraction these route files no
longer live under `platform/`, so this class is closed by relocation.

## C4 — Platform SQL not registered in `dos_migrator`

DDL files under `platform/dsoc/migrations/`, `platform/dnoc/migrations/`,
and `platform/dos/migrations/` are run by ad-hoc tooling, not by the
canonical `dos_migrator` runner ([packages/dos-db/src/tenant-migrations.ts](../../packages/dos-db/src/tenant-migrations.ts)).
This means none of them register in `dos.tenant_migrations`, so we cannot
audit which platform SQL has been applied to which tenant.

Affected files (~30):
- `platform/dsoc/migrations/public/20260422_0010_create_platform_dsoc_schema.sql` (+ down)
- `platform/dsoc/migrations/public/20260423_0020_dsoc_extensions.sql`
- `platform/dnoc/migrations/public/...` (parallel set)
- `platform/dos/migrations/public/20260423_0100_create_platform_dos_schema.sql` (+ down)
- `platform/dos/migrations/public/20260423_0200_platform_hierarchy.sql`
- `platform/dos/migrations/public/20260423_0300_dos_extensions.sql`
- `platform/dos/migrations/public/20260423_0400_cross_platform.sql`
- `platform/dos/migrations/public/20260424_0200_governance_decisions.sql`
- `platform/dos/migrations/public/20260425_0001..0017_*` (~15 files)

**Wave B.3 plan:**
1. Decide whether `platform/dos/migrations/public/*` is itself a discovery
   root (these are platform-public schemas, not per-tenant) — if yes, add
   `platform/*/migrations/public/` to the migration runner's discovery list
   and record applied filenames in a new `dos.platform_migrations` ledger
   (parallel to `dos.tenant_migrations`).
2. Or move them under `modules/foundation/db/migrations/` if they're
   tenant-template DDL.
3. After the move, ban ad-hoc SQL execution: any platform-level CREATE
   must register through the runner.

**Verification:**
```sql
SELECT count(*) FROM dos.platform_migrations
  WHERE filename LIKE 'platform/dsoc/%';
```
should be > 0 once Wave B.3 lands.

## Out-of-scope notes

- **modules/** is intentionally not policed for product names — modules ARE
  products (or product capabilities). Rule #1 only covers `platform/`.
- The 90 raw-UPDATE bypasses inside `platform/` are tracked separately in
  [lifecycle-bypasses-2026-04-30.md](./lifecycle-bypasses-2026-04-30.md). Many of those will disappear when
  Wave B.1 relocates `agrc-engine/` and `vendor/`.
- `packages/shahin-product/` is the correct home for Shahin-only product
  catalogs (canonical-roles, canonical-permissions, agent codes A01-A13).
  No moves required there.
