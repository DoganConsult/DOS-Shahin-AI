# Foundation DB Gate 2A.1 — Tenant Data-Volume + Phantom Entitlement Impact Proof

**Mode:** READ-ONLY AUDIT. No data changes, no DDL, no migrations, no `schema_status`, no orphan marking, no tpm deletes, no quarantines, no RLS changes.
**Live DB:** PostgreSQL 18 @ `127.0.0.1:5432/shahin_grc` — introspected at gate run.
**Predecessor:** `_phase1-foundation-gate-2a.md`.

---

## 1. Dpgan/Dogan duplicate data-volume comparison

Both physical schemas exist; both registry rows are `active`; both display `Dpgan Consult`. Numerical comparison:

| Metric | `2c71cc2d-…` (`tenant_2c71cc2d…`) | `2ba4b532-…` (`tenant_2ba4b532…`) |
|---|---|---|
| Schema size | 50 MB | 50 MB |
| BASE TABLE count | 1851 | 1851 |
| `pg_class.reltuples` SUM (approx total rows) | **8891** | **8899** |
| Non-empty tables (reltuples>0) | 3 | 4 |
| `event_outbox` rows | **10523** | **10455** |
| `event_outbox` first→last `created_at` | 2026-04-29 21:05:02 → **2026-04-30 07:35:38** (now) | 2026-04-29 21:05:01 → **2026-04-30 07:35:37** (now) |
| `module_config` rows | 212 | 212 |
| `ai_event_producer_cursors` | 4 | 4 |
| `ai_agent_executions` | — | **75** |
| `users` table | **MISSING** (table not created in tenant template) | **MISSING** |
| `organizations` table | **MISSING** | **MISSING** |
| `roles` / `permissions` tables | MISSING / MISSING (only `functional_roles`, `role_profiles`, `user_role_assignments` exist) | MISSING / MISSING |
| `audit_trail` rows | **0** | **0** |
| `workflow_instances` rows | **0** | **0** |
| `evidence_items` rows | **0** | **0** |
| Last activity proxy | 2026-04-30 07:35:38Z (event-loop only) | 2026-04-30 07:35:37Z (event-loop only) |

### 1.1 Findings

- **Both schemas are functionally empty.** No users, orgs, audit, workflow, or evidence rows. Activity is exclusively `event_outbox` write-amplification from a platform job (≈10k rows/day).
- The schemas are **freshly provisioned templates**, not real customer tenants. No business data exists in either.
- `2ba4b532-…` has 75 extra rows in `ai_agent_executions` — only material difference.
- `event_outbox` is currently live in BOTH schemas (last write within seconds of the gate run) — implying scheduled jobs are writing to ghost tenants, an additional ops concern.

### 1.2 Recommendation

| tenant_id | recommendation |
|---|---|
| `2c71cc2d-6728-4394-b2c4-02ac087bba82` | **needs manual review** — no business data; pick by *registration intent*, not by data volume |
| `2ba4b532-3361-413c-ac6c-9c992f66bec4` | **needs manual review** — same |

**Suggested resolution:** since neither holds business data, choose the **earlier** registration (`2c71cc2d-…`, registered 2026-04-25 15:07:58Z) as canonical and mark `2ba4b532-…` as `duplicate_of=2c71cc2d-…`. **Decision not made in this gate.** Also: both should later be renamed `display_name='Dogan Consult'` (typo correction).

---

## 2. Phantom `tenant_product_modules` inventory (the 48 orphans)

### 2.1 Counts

| Metric | Value |
|---|---|
| Orphan registry rows | **48** |
| Phantom `tpm` rows total | **2448** |
| Distinct `module_code` per tenant | **51** (uniform) |
| Distinct tenants holding rows | **48** (all orphans hold rows) |
| Distinct `product_code` | **1** (`shahin`) |
| `activated_at` range | 2026-04-23 06:06:12Z → 2026-04-23 06:14:11Z (single 8-minute batch) |
| Distinct row-signatures (md5 of sorted module_code per tenant) | **1** (all 48 tenants are byte-identical) |

### 2.2 Module list (identical across all 48 orphans)

```
action, agrc-engine, ai, ai-governance, asset, attestation, audit, bcp, benchmarks,
compliance, controls, dashboard, dashboard-editor, data, dora, evidence, exception,
executive, fitch, governance, governance-ai, governance-os, grc-query, inbox, incident,
integrations, issues, journey, knowledge, ksa-regulatory, local-knowledge, mcp, mobile,
onboarding, operating-cockpit, packs, journey, playbooks, policy, portals, privacy,
proactive-leadership, qiyas, records, remediation, reporting, risk, team, training,
vendor, widgets, workflow
```

### 2.3 Dependency check

- **Same module_code rows in non-orphan tenants:** **51** (only `dogan` has them — confirms phantom rows do not block real data).
- **Foreign keys pointing TO `platform_dos.tenant_product_modules`:** **NONE.** No table FK-references this table; deleting rows is safe at the schema level.
- The 51 `module_code` *values* themselves are catalog entries also used by `dogan` and by the 8 matched non-dogan tenants (which have 0 tpm rows of their own — see §3). Deleting the **phantom rows** does not delete the **module catalog** — they are independent.

### 2.4 Recommended cleanup class

| Subset | Class | Reason |
|---|---|---|
| All 2448 phantom tpm rows | **safe_to_delete_later** | No FK in, no business data dependency, byte-identical across all 48 tenants, originate from a single batch, target tenants have no schema. |

Caveat: deletion must happen in the *same* migration that marks the registry rows as `orphan_provisioning_failed` to avoid re-inserting from a re-run of the same broken provisioning batch.

---

## 3. Matched tenants with schema but zero `tenant_product_modules`

| tenant_id | display_name | schema | tpm count | expected tpm | classification |
|---|---|---|---:|---:|---|
| `dogan` | dogan | `tenant_dogan` | **51** | 51 | **baseline** (only correctly-entitled tenant) |
| `2c71cc2d-6728-4394-b2c4-02ac087bba82` | Dpgan Consult | `tenant_2c71cc2d…` | **0** | 51 (if kept canonical) | **duplicate_no_backfill** (becomes the canonical Dogan; backfill only after collapse) |
| `2ba4b532-3361-413c-ac6c-9c992f66bec4` | Dpgan Consult | `tenant_2ba4b532…` | **0** | 0 (mark duplicate_of) | **duplicate_no_backfill** |
| `76ce30e4-…` | E2E Test Co | `tenant_76ce30e4…` | **0** | 0 | **test_no_backfill** |
| `a765b0362188` | E2E Probe Company | `tenant_a765b0362188` | **0** | 0 | **test_no_backfill** |
| `d28556d1-…` | Hehheh | `tenant_d28556d1…` | **0** | 0 | **test_no_backfill** |
| `84387f0b-…` | werwerwer | `tenant_84387f0b…` | **0** | 0 | **test_no_backfill** |
| `shahin_visitors` | Shahin-Ai Visitors | `tenant_shahin_visitors` | **0** | 51 | **visitor_sandbox** (entitlement model = "all enabled, ephemeral"; explicit backfill needed for routing) |

**Summary:** the only Phase-2B tenant requiring `should_backfill_modules` is **`shahin_visitors`** (sandbox needs all 51 modules) plus eventually the *one* canonical Dpgan winner.

---

## 4. Dangling schema data-volume proof

`pg_class.reltuples` is unreliable on schemas that have never been ANALYZE-d (`-3`/`-1637`/`-1627` = pg_class default sentinel). Numbers below should be read as "not yet measured" except where positive.

### 4.1 `tenant_51f36271df62ea3d`

| Metric | Value |
|---|---|
| Size | 45 MB |
| Approx rows (reltuples sum) | -3 (never analyzed) |
| Non-empty tables (per reltuples) | **0** |
| Last `event_outbox` | **EMPTY** |
| `dos.tenants` row | YES (`tenant_id=51f36271df62ea3d`, `tenant_name='Info Dogan Consult workspace'`) |
| `public.tenants` row | NO |
| **Recommendation** | **manual_review** — `dos.tenants` says "Info Dogan Consult workspace" (could be a real customer); but no events, no rows. Safe to back-fill registry then quarantine after 7-day soak. |

### 4.2 `tenant_a7f7b3f6f0df`

| Metric | Value |
|---|---|
| Size | 45 MB |
| Non-empty tables | **1** (`module_config` 212) |
| Last `event_outbox` | **EMPTY** |
| `dos.tenants` row | YES (`tenant_code=a7f7b3f6f0df`, `tenant_name='Tenant a7f7b3f6f0df'`) |
| `public.tenants` row | YES (`tenant_name_en='AcceptanceCo1777152936e77976'`) |
| **Recommendation** | **backfill_registry → quarantine_after_backup** — acceptance-test footprint, no business data. |

### 4.3 `tenant_douhan_consult`

| Metric | Value |
|---|---|
| Size | 45 MB |
| Non-empty tables | **2** (`module_config` 217, `workflow_templates` 4) |
| Last `event_outbox` | **EMPTY** |
| `dos.tenants` row | YES (`tenant_code=douhan_consult`, `tenant_name='Douhan Consult (dev)'`) |
| `public.tenants` row | YES (`tenant_name_en='Dogan Consult'`) |
| **Recommendation** | **backfill_registry → keep** as the dev twin of `tenant_dogan` (intentional dev sandbox; 4 workflow templates suggest active dev use). |

### 4.4 `tenant_f2a45bc25f31`

| Metric | Value |
|---|---|
| Size | 46 MB |
| Non-empty tables | **8** (`agent_tool_permissions` 24, `incident_taxonomy` 21, `controls` 13, `ai_context_sources` 13, `module_config` 212, `navigation_registry` 6, `incident_reportable_criteria` 4, `workspaces` 1) |
| Last `event_outbox` | **EMPTY** |
| `dos.tenants` row | YES (`tenant_code=f2a45bc25f31`, `tenant_name='Tenant f2a45bc25f31'`) |
| `public.tenants` row | YES (`tenant_name_en='stc-mofg3saq'`) |
| **Recommendation** | **manual_review → backfill_registry** — most data of any dangling schema (controls/incident taxonomy seeded). Looks like an STC POC tenant. Do NOT quarantine without owner sign-off. |

### 4.5 `tenant_validate_migrations`

| Metric | Value |
|---|---|
| Size | 45 MB |
| Non-empty tables | **1** (`module_config` 212) |
| Last `event_outbox` | **EMPTY** |
| `dos.tenants` row | NO |
| `public.tenants` row | NO |
| **Recommendation** | **keep_validation_schema** + back-fill registry row tagged `validation_schema`. Migration runner sentinel — DO NOT drop. |

---

## 5. Onboarding spam residue (`dos.tenants` no registry no schema)

| Metric | Value |
|---|---|
| Row count | **27** |
| `created_at` range | 2026-04-26 20:34:32Z → 2026-04-30 06:35:46Z |
| Naming patterns | "Ahmet Dogan workspace" (×11), "Visitor … workspace" (×3), "E2E … workspace" (×3), "Smoke Test workspace", "Final Verify Org workspace", "TestUser workspace", "Legacy Workspace", "DDDDDD SSSSSS workspace", "see dxx workspace", "AHMET DOGAN workspace", "srtsertesrtf werswerwesr workspace", "Aherermet Dogereran workspace" |
| Source/origin | **onboarding-service** — pattern matches the workspace-naming convention in `services/onboarding-service` (`<full_name> workspace`). Each row corresponds to an onboarding signup that produced a `dos.tenants` row + `dos.users` row + `dos.tenant_memberships` row but never reached the `tenants_registry`/schema-create step. |
| `dos.tenant_memberships` rows referencing them | **26** |
| `dos.users` rows referencing them | **28** |
| `public.onboarding_sessions` rows referencing them | **0** (sample of first 5 — onboarding session was discarded) |

### 5.1 Recommendation

| Subset | Class | Reason |
|---|---|---|
| 27 onboarding spam tenants | **needs owner review** | Not a Foundation cleanup. Onboarding-service writes `dos.tenants` BEFORE registry/schema creation. The 28 user rows + 26 membership rows mean live orphan FKs across `dos.users` and `dos.tenant_memberships`. Cleanup belongs to onboarding-service team. **Foundation must NOT touch these rows in Phase 2B.** |

---

## 6. Phase 2B readiness decision

| Gate | Verdict | Reason |
|---|:-:|---|
| **SAFE_TO_PREPARE_SCHEMA_STATUS_MIGRATION** | **YES** | Additive-only column on `platform_dos.tenants_registry` (NULLABLE or DEFAULT `'active'`) is non-breaking. Migration script can be drafted now. |
| **SAFE_TO_MARK_45_HEX_ORPHANS** | **YES** (in same migration as tpm cleanup) | Single-batch origin, identical signature, no schema, no users, no provisioning evidence — unambiguous `orphan_provisioning_failed`. |
| **SAFE_TO_MARK_3_NAMED_TEST_STUBS** | **YES** | `rimtest1776461709`, `tenta`, `tentb` — same orphan profile, names self-identify as test fixtures. |
| **SAFE_TO_DELETE_OR_ARCHIVE_PHANTOM_TPM_ROWS** | **YES** (with archive-first policy) | 2448 rows, no FK in, no dependency. Archive into `platform_dos.tenant_product_modules_archive_<ts>` THEN delete in same transaction with the orphan-marking step. |
| **SAFE_TO_BACKFILL_DANGLING_SCHEMA_REGISTRY_ROWS** | **YES** for 4/5 (`a7f7b3f6f0df`, `douhan_consult`, `f2a45bc25f31`, `validate_migrations`); **MANUAL** for 1 (`51f36271df62ea3d` — possible real customer "Info Dogan Consult workspace") | Identity is recoverable from `dos.tenants` for 4 of 5; the 5th needs human review of customer relationship. |
| **SAFE_TO_PICK_CANONICAL_DPGAN_TENANT** | **NO** | Both schemas are byte-equivalent and devoid of business data. Decision is *organizational*, not data-driven. Requires owner input on which `tenant_id` to give the real Dogan Consult customer. Defer to owner before Phase 2B mutation. |

**Aggregate Phase 2B verdict:** **PARTIALLY READY.** Safe to proceed with: (a) drafting the additive `schema_status` migration; (b) drafting the orphan-marking + tpm-archive script for 48 orphans (45 hex + 3 named); (c) drafting registry back-fill SQL for 4 of 5 dangling schemas. **Hard blockers** for full Phase 2B: Dpgan canonical decision (human input required) and onboarding-service ownership of the 27 `dos.tenants` spam residue.

---

## Appendix — Read-only SQL used

### Q1.1 — duplicate schema sizes + table count

```sql
SELECT s.schema_name,
  pg_size_pretty(SUM(pg_total_relation_size(format('%I.%I', s.schema_name, t.table_name)::regclass))) AS size
FROM information_schema.schemata s
JOIN information_schema.tables t ON t.table_schema=s.schema_name AND t.table_type='BASE TABLE'
WHERE s.schema_name IN ('tenant_2c71cc2d67284394b2c402ac087bba82','tenant_2ba4b5323361413cac6c9c992f66bec4')
GROUP BY s.schema_name;

SELECT table_schema, count(*) FROM information_schema.tables
WHERE table_schema IN ('tenant_2c71cc2d67284394b2c402ac087bba82','tenant_2ba4b5323361413cac6c9c992f66bec4')
  AND table_type='BASE TABLE' GROUP BY table_schema;
```

### Q1.2 — top 25 non-empty tables (per schema)

```sql
SELECT relname, reltuples::bigint AS approx_rows,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS sz
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='<schema>' AND c.relkind='r' AND reltuples>0
ORDER BY reltuples DESC LIMIT 25;
```

### Q1.3 — exact key-table counts

```sql
SELECT count(*) FROM "<schema>"."<users|organizations|roles|permissions|audit_trail|workflow_instances|evidence_items>";
```

### Q1.4 — last-activity proxy

```sql
SELECT min(created_at), max(created_at) FROM "<schema>".event_outbox;
```

### Q2.1 — phantom tpm counts

```sql
WITH schemas AS (
  SELECT lower(regexp_replace(schema_name,'^tenant_','')) AS norm
  FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%'
),
orphans AS (
  SELECT tenant_id FROM platform_dos.tenants_registry r
  WHERE NOT EXISTS (SELECT 1 FROM schemas s WHERE s.norm=lower(regexp_replace(r.tenant_id,'-','','g')))
)
SELECT count(*) AS phantom_tpm_rows,
       count(DISTINCT tpm.module_code) AS distinct_modules,
       count(DISTINCT tpm.tenant_id)   AS tenants_with_rows,
       count(DISTINCT tpm.product_code) AS distinct_products
FROM platform_dos.tenant_product_modules tpm
WHERE tpm.tenant_id IN (SELECT tenant_id FROM orphans);
```

### Q2.2 — module signature uniformity

```sql
WITH orphans AS (...same CTE...),
sigs AS (
  SELECT tenant_id, md5(string_agg(module_code, ',' ORDER BY module_code)) AS sig
  FROM platform_dos.tenant_product_modules
  WHERE tenant_id IN (SELECT tenant_id FROM orphans)
  GROUP BY tenant_id
)
SELECT count(*) AS tenants, count(DISTINCT sig) AS distinct_sigs FROM sigs;
```

### Q2.3 — activated_at range + product_code

```sql
SELECT product_code, count(DISTINCT module_code), min(activated_at), max(activated_at)
FROM platform_dos.tenant_product_modules WHERE tenant_id IN (...orphans...)
GROUP BY product_code;
```

### Q2.4 — FK references TO tenant_product_modules

```sql
SELECT conrelid::regclass, conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE contype='f' AND confrelid='platform_dos.tenant_product_modules'::regclass;
```

### Q3 — matched tenants tpm count

```sql
SELECT r.tenant_id, r.display_name,
  (SELECT count(*) FROM platform_dos.tenant_product_modules tpm WHERE tpm.tenant_id=r.tenant_id) AS tpm_n
FROM platform_dos.tenants_registry r
WHERE r.tenant_id IN (...the 8 matched...);
```

### Q4 — dangling schema proof

```sql
SELECT pg_size_pretty(SUM(pg_total_relation_size(c.oid))) AS sz,
       SUM(c.reltuples)::bigint AS approx_rows,
       count(*) FILTER (WHERE c.reltuples>0) AS non_empty_tables
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='<schema>' AND c.relkind='r';

SELECT relname, reltuples::bigint, pg_size_pretty(pg_total_relation_size(c.oid))
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='<schema>' AND c.relkind='r' AND reltuples>0
ORDER BY reltuples DESC LIMIT 25;

SELECT max(created_at) FROM "<schema>".event_outbox;
```

### Q5 — onboarding spam residue

```sql
WITH schemas AS (
  SELECT lower(regexp_replace(schema_name,'^tenant_','')) AS norm
  FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%'
),
reg AS (
  SELECT lower(regexp_replace(tenant_id,'-','','g')) AS norm FROM platform_dos.tenants_registry
)
SELECT tenant_id::text, tenant_code, tenant_name, created_at
FROM dos.tenants dt
WHERE NOT EXISTS (SELECT 1 FROM reg r WHERE r.norm=lower(regexp_replace(dt.tenant_id::text,'-','','g')) OR r.norm=lower(dt.tenant_code))
  AND NOT EXISTS (SELECT 1 FROM schemas s WHERE s.norm=lower(regexp_replace(dt.tenant_id::text,'-','','g')))
ORDER BY created_at;

SELECT count(*) FROM dos.tenant_memberships WHERE tenant_id::text IN (...27 ids...);
SELECT count(*) FROM dos.users               WHERE tenant_id::text IN (...27 ids...);
SELECT count(*) FROM public.onboarding_sessions WHERE tenant_id::text IN (...sample 5 ids...);
```
