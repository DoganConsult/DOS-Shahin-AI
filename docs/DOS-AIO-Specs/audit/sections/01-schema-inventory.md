# Section 1 — Schema Inventory

**Source:** live introspection of `shahin_grc` on `127.0.0.1:5432` at audit kickoff.
**Raw evidence:** [`../_evidence/01-tables-non-tenant.tsv`](../_evidence/01-tables-non-tenant.tsv), [`../_evidence/02-tenant-template-tables.txt`](../_evidence/02-tenant-template-tables.txt), [`../_evidence/03-tenant-schemas.txt`](../_evidence/03-tenant-schemas.txt), [`../_evidence/04-tenant-id-presence.tsv`](../_evidence/04-tenant-id-presence.tsv), [`../_evidence/05-rls-status.tsv`](../_evidence/05-rls-status.tsv).

## 1.1 Schema map (functional purpose)

| Schema | Owner | Tables | `tenant_id` columns | RLS enabled | Intent (per code/manifests) | Verdict |
|--------|-------|-------:|--------------------:|------------:|-----------------------------|---------|
| `public`        | `pg_database_owner` | **358** | 81 (23%) | 14 (4%) | Catch-all: lookup catalogs, AI registries, MCP, onboarding session state, powa metrics, dos_* operational, GRC reference (`grc_frameworks`, `grc_regulators`, `lookup_*`), legacy duplicates. | **P0 — overloaded; must be split** |
| `dos`           | `dos_migrator`      | **204** | 148 (73%) | 13 (6%)  | Primary cross-tenant operational schema: `users`, `tenants`, `organizations`, `risks`, `controls`, `policies`, `audit_trail`, `workflow_*`, `dynamic_ui_*`, `foundation_*`, `governance_*`, `notifications`. | **P0 — RLS missing, must enforce** |
| `platform_dauth`| `dos_migrator`      | **37**  | 22 (59%) | 1 (3%)   | DAuth dedicated namespace (Phase 1 views layer per `platform/dauth/docs/G8-SCHEMA-MIGRATION.md`): permissions, role-permissions, sessions, MFA, OAuth, SoD, audit logs. Some tables are **views** over `dos.*`/`public.*`. | **P1 — RLS gap; cutover incomplete** |
| `platform_dos`  | `postgres`          | **25**  | 13 (52%) | 0 (0%)   | Platform registry: `tenants_registry`, `products_registry`, `modules_registry`, `tenant_products`, `tenant_product_modules`, `services_registry`, `feature_flags`, `event_outbox`, `scheduled_jobs`. Layer 2/3 truth. | **P1 — RLS off across the board** |
| `platform_dsoc` | `postgres`          | **10**  | 8 (80%) | 0 (0%)   | DSOC: `incidents`, `alerts`, `detection_rules`, `posture_findings`, `audit_log`, `sod_violations`, `threat_indicators`. | **P1 — RLS off** |
| `platform_dnoc` | `postgres`          | **11**  | 1 (9%)  | 0 (0%)   | DNOC observability: `routes`, `route_hits`, `metrics`, `traces`, `logs`, `health_checks`, `circuit_breaker_state`. Mostly platform-global (no tenant_id intended). | OK for global; logs/traces should add tenant_id |
| `onb`           | `dos_migrator`      | **15**  | 1 (7%)  | 0 (0%)   | Onboarding sub-namespace: `answers`, `inferred_facts`, `recommendations`, `scores`, `session_stages`, `templates`, `pack_modules`, `product_packs`, `ui_configs`. Conflicts with `public.onboarding_*` (35 tables). | **P0 — duplicated with public.onboarding_*** |
| `ai`            | `postgres`          | **9**   | 0 (0%)  | 0 (0%)   | pgai/Timescale extension: `vectorizer`, `semantic_catalog`, `pgai_lib_*`. Extension-managed, not application data. | Leave as-is (extension) |
| `dos_archive`   | `dos_auth`          | **2**   | —       | —        | Archive of `tenant_migrations_failed_20260430`, `tenant_migrations_orphans_20260430`. Operational artefact. | OK — archival |
| `tenant_<uuid|alias>` × **13** | `dos_auth`/`shahin` | **~1850 each** | — | varies | Per-tenant business data (full module set replicated per tenant). Template = `tenant_dogan`. | **P1 — replication strategy must be confirmed (extension fan-out vs hand-replication)** |

Other schemas (extension/system, not in audit scope): `citus`, `citus_internal`, `pgmq`, `pglogical`, `repack`, `squeeze`, `hint_plan`, `oracle`, `dbms_*`, `pl*_*`, `topology`, `utl_file`, `pgai/ai_admin`.

## 1.2 Tenant schema set (Layer 4 isolation)

| Schema | Likely tenant | Tables |
|--------|---------------|-------:|
| `tenant_dogan`             | Dogan Consult internal demo | 1850 |
| `tenant_douhan_consult`    | Douhan Consult              | 1850 |
| `tenant_shahin_visitors`   | Visitor / marketing tenant  | 1830 |
| `tenant_validate_migrations` | Migration validation harness | 1849 |
| `tenant_a765b0362188`, `tenant_51f36271df62ea3d`, `tenant_a7f7b3f6f0df`, `tenant_f2a45bc25f31` | Short-id tenants (legacy id format) | 1850–1861 |
| `tenant_2ba4b5323361413cac6c9c992f66bec4`, `tenant_2c71cc2d67284394b2c402ac087bba82`, `tenant_76ce30e4168341d09913919227afdf1a`, `tenant_84387f0b783a47f78cf1f844b31ad286`, `tenant_d28556d16acd46b79b2f170ad3b5cfb8` | UUID-named tenants (`platform_dos.tenants_registry` has 56 rows, but only **13** physical schemas exist) | 1851 each |

**P0 finding (tenants_registry drift):** `platform_dos.tenants_registry` has **56** tenants and `platform_dos.tenant_products` has **56** rows, but only **13** physical `tenant_*` schemas exist. The other 43 registry rows have no schema → orphan tenants OR bug in provisioning OR the registry includes deleted/test rows. Must reconcile.

## 1.3 Migration tracker proliferation (P1)

Nine migration-tracking tables across four schemas:
| Schema | Table | Purpose (inferred) |
|--------|-------|-------------------|
| `dos`         | `migration_history`              | Primary applied-migration log |
| `dos`         | `migration_lock`                 | Advisory lock for runner |
| `dos`         | `migration_status`               | View / status snapshot |
| `dos`         | `module_migrations`              | Per-module migration log |
| `dos`         | `platform_migrations`            | Platform-layer migration log |
| `dos`         | `schema_migrations`              | Likely Knex/legacy tracker |
| `dos`         | `tenant_migrations`              | Per-tenant applied-migration log |
| `dos`         | `tenant_migrations_failed`       | Failures (with `dos_archive` snapshot from 2026-04-30) |
| `dos`         | `tenant_migrations_latest`       | View of newest per tenant |
| `platform_dos`| `migrations_applied`             | Parallel platform_dos copy |
| `public`      | `dos_migrations`                 | Older root tracker (predates `dos.*`) |
| `public`      | `schema_migrations`              | Knex-style tracker at root |
| `ai`          | `pgai_lib_migration`             | Extension-managed (out of scope) |

**Recommendation (deferred):** consolidate to `dos.schema_migrations` + `dos.tenant_migrations` only. All others should be deprecated after lineage proof.

## 1.4 RLS posture summary (P0)

| Schema | Tables with `tenant_id` | Tables with RLS on | Gap (tenant_id ∧ ¬RLS) |
|--------|------------------------:|-------------------:|------------------------:|
| `public`        | 81  | 14 | **67** |
| `dos`           | 148 | 13 | **135** |
| `platform_dauth`| 22  | 1  | **21** |
| `platform_dos`  | 13  | 0  | **13** |
| `platform_dsoc` | 8   | 0  | **8** |
| `platform_dnoc` | 1   | 0  | 1 |
| `onb`           | 1   | 0  | 1 |
| **Total**       | **274** | **28 (10%)** | **246** |

**246 tables hold a `tenant_id` column without RLS enforcement.** Tenant isolation in cross-tenant schemas relies entirely on application-layer `WHERE tenant_id = $1` filtering — single missed predicate = full cross-tenant leak. This is the headline P0 normalization finding.

## 1.5 Foreign-key density (Section 9 input)

227 FK edges in non-tenant schemas (full list in [`07-fk-edges.tsv`](../_evidence/07-fk-edges.tsv)). Tenant template not yet introspected for FK density (1850 tables × ~3 FKs avg ⇒ ~5500 FKs/tenant × 13 tenants = ~70k tenant FKs — to confirm in Phase 1 deliverable).
