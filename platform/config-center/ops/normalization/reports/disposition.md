# Phase A+B Final Disposition Report

Generated from: [classification.json](classification.json)
Prefix rules: [../module-prefixes.yml](../module-prefixes.yml)
Reverse index: [file-to-table.json](file-to-table.json)

## Summary

**189 SQL files** classified (the subset of 256 catalog-scanned files that contain CREATE/ALTER TABLE statements). After three rounds of rule enrichment:

| Confidence | Count | Meaning |
|---|---|---|
| high | 167 | single-owner: path-under-modules OR all tables match one module's prefix |
| medium | 7 | dominant owner (≥ 80% of tables) |
| low | 15 | genuinely multi-owner — requires statement-level splitting |

**174 files are ready for Phase C git-mv** once per-module manifests are drafted.

## Per-module distribution (high + medium)

| Module | Files |
|---|---|
| platform-core | 34 |
| risk | 16 |
| onboarding | 15 |
| incident | 7 |
| compliance, notification | 5 each |
| audit, workflow | 3 each |
| everything else | 1-2 each |

## The 15 residual multi-owner files

Per user directive "fix all", these will be split per-module by a new tool `ops/normalization/scripts/split-megafile.ts` (to be built — Phase B.5). For each, the splitter will:

1. Parse SQL statements preserving DDL grouping (CREATE TABLE + its adjacent CREATE INDEX / ALTER TABLE / CREATE POLICY / COMMENT ON)
2. Attribute each statement-group to its owning module via `classify-by-prefix.ts` table-level rules
3. Emit `modules/{mod}/db/tenant/migrations/NNN_extracted_from_<source>.sql` per module
4. Mark the source file with a `-- dos:split-superseded-by: [...]` header comment and **relocate it** to `modules/platform-core/db/_frozen/` so its applied-checksum row in `dos.platform_migrations` stays intact (path-agnostic lookup via the runner's new `current_path` column).

| # | File | Tables | Top candidate owners |
|---|---|---|---|
| 1 | `ops/migrations/tenant/027_tenant_schema_tables.sql` | 1192 | ai-governance:55, action:27, agrc-engine:27, ai:27, asset:27 … |
| 2 | `ops/migrations/expected-schema.sql` | 303 | **EXCLUDE** — reference snapshot, not an applied migration |
| 3 | `ops/migrations/tenant/000_inline_baseline.sql` | 52 | platform-core:25, compliance:4, dashboard:4, qiyas:4 |
| 4 | `ops/migrations/009b_service_domain_tables.sql` | 34 | platform-core:4, audit:2, training:2, workflow:2 |
| 5 | `ops/migrations/016_onboarding_module_tables.sql` | 14 | platform-core:8, onboarding:4, ai:1 |
| 6 | `ops/migrations/tenant/118_incident_vendor_bcp_config_tables.sql` | 13 | bcp:4, incident:4, vendor:3 |
| 7 | `ops/migrations/018_create_lookup_tables.sql` | 11 | platform-core:8, ksa-regulatory:3 |
| 8 | `ops/migrations/029_hardening_infrastructure.sql` | 10 | platform-core:5, onboarding:5 |
| 9 | `ops/migrations/tenant/125_ai_dynamic_tables.sql` | 9 | ai-governance:4, ai:3, agrc-engine:2 |
| 10 | `ops/migrations/tenant/037_platform_runtime_tables.sql` | 6 | platform-core:3, ai-governance:1, ai:1, onboarding:1 |
| 11 | `ops/migrations/tenant/099_bootstrap_tenant_domain_tables.sql` | 6 | incident:2, risk:2, ai:1 |
| 12 | `ops/migrations/20260418_0011_service_domain_schema_align_down.sql` | 5 | asset:1, bcp:1, policy:1, risk:1, vendor:1 |
| 13 | `ops/migrations/20260418_0011_service_domain_schema_align.sql` | 5 | (same) |
| 14 | `ops/migrations/033_question_bank_constraints_and_answers.sql` | 4 | onboarding:3, platform-core:1 |
| 15 | `ops/migrations/201_hybrid_layer_conflict_renames.sql` | 4 | platform-core:3, audit:1 |

**Exclusion**: `expected-schema.sql` is a regenerable pg_dump-style snapshot (confirmed: no runner references it, begins with `CREATE SCHEMA dos; CREATE SCHEMA onb;` bootstrap). Not an applied migration — add to catalog-build.ts ignore list.

## Coverage gap (known)

`services/*/migrations/` (126 files) are **not in the catalog** because `catalog-build.ts` only scans `ops/migrations/` and `modules/*/source/backend/*/migrations/`. Services must be added before they can be classified and relocated.

## Next actionable steps (in order)

1. Exclude `expected-schema.sql` from catalog-build.ts scan
2. Extend catalog-build.ts to scan `services/*/migrations/**/*.sql`
3. Build `ops/normalization/scripts/split-megafile.ts` — statement-aware SQL splitter
4. Run splitter on 14 multi-owner files (not expected-schema)
5. Draft per-module manifest.yml files (47 active modules + platform-core)
6. Migration runner changes: add `current_path` + checksum-remap + supersedes logic
7. Phase C: git-mv all ready files + post-split extracts into modules/{mod}/db/
8. Phase D: platform-core absorption of dos.* public schema
9. Phase E: per-module normalization with MODULE= Makefile filter
10. Phase F: CI ownership check
