# DOS-AIO — DB + Normalization + Module Activation Audit

**Mode:** AUDIT-ONLY. No code changes, no migrations, no seeds, no deletions performed.
**DB inspected:** PostgreSQL 18 @ `127.0.0.1:5432`, database `shahin_grc` (live).
**PM2 fleet:** 36 processes online (snapshot at audit start).
**Kickoff:** 2026-04-30.

## Layout
- [`sections/`](./sections) — cross-cutting deliverables (schema inventory, ownership matrix, public seed report, onboarding contract, activation contract, trigger map, normalization findings, remediation sequence).
- [`modules/`](./modules) — per-module DB maps, grouped per the 8-phase execution order from [`../../AGENTS.md`](../../AGENTS.md).
- [`_evidence/`](./_evidence) — raw evidence dumps from live DB introspection (TSV/text, regenerated each audit run).

## Phase deliverables (sequenced)

| Phase | Status | Report |
|-------|--------|--------|
| 0 — Schema/inventory baseline | DONE | [sections/01-schema-inventory.md](./sections/01-schema-inventory.md), [sections/02-table-ownership.md](./sections/02-table-ownership.md) |
| 1 — Foundation / Org layer    | DONE | [modules/_phase1-foundation.md](./modules/_phase1-foundation.md) |
| 2 — Workflow layer            | PENDING | modules/_phase2-workflow.md |
| 3 — Governance layer          | PENDING | modules/_phase3-governance.md |
| 4 — Risk layer                | PENDING | modules/_phase4-risk.md |
| 5 — Compliance/Controls layer | PENDING | modules/_phase5-compliance.md |
| 6 — Evidence/Audit/Reporting  | PENDING | modules/_phase6-evidence-audit.md |
| 7 — Extended business modules | PENDING | modules/_phase7-extended.md |
| 8 — AI/Runtime/Observability  | PENDING | modules/_phase8-ai-runtime.md |
| Final — Aggregation sections 3–10 | PENDING | sections/03–10 |

## Evidence files (`_evidence/`)
| File | Description |
|------|-------------|
| `01-tables-non-tenant.tsv`     | All tables in non-tenant schemas (schema, table, col_count, bytes). 672 rows. |
| `02-tenant-template-tables.txt`| Table list of `tenant_dogan` schema (canonical tenant template). 1850 rows. |
| `03-tenant-schemas.txt`        | All 13 `tenant_*` schemas present in DB. |
| `04-tenant-id-presence.tsv`    | Per-table boolean: does the table have a `tenant_id` column. |
| `05-rls-status.tsv`            | Per-table `relrowsecurity` / `relforcerowsecurity` flags. |
| `06-migration-trackers.txt`    | All migration-tracking tables found across schemas. |
| `07-fk-edges.tsv`              | All foreign-key edges in non-tenant schemas (227 edges). |
| `08-manifest-owned-tables.tsv` | `ownedTables` extracted from every `module.manifest.json` (50/59 manifests populated). |
