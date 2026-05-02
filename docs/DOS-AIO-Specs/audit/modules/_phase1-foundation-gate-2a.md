# Foundation DB Gate 2A — Tenant Registry Reconciliation Proof

**Mode:** AUDIT + CLASSIFICATION ONLY. No data changes. No DDL. No migrations. No `schema_status` column added. No orphan marking. No schema drops. No RLS changes. No writes to users / login_attempts / invitations / sod_rules / feature_flags / audit tables.
**Live DB:** PostgreSQL 18 @ `127.0.0.1:5432/shahin_grc` — introspected at gate run.
**Predecessor:** `_phase1-foundation-gate.md` §2 (Tenant Truth Reconciliation).

---

## 1. Current counts

| Source | Count |
|--------|------:|
| `platform_dos.tenants_registry` | **56** |
| `platform_dos.tenant_products` | **56** |
| `platform_dos.tenant_product_modules` | **2499** |
| `dos.tenants` | **33** |
| `public.tenants` | **15** |
| Physical `tenant_*` schemas | **13** |
| `platform_dos.tenant_provisioning_jobs` | **0** (empty — no provisioning audit trail exists) |

Read-only SQL:

```sql
SELECT 'platform_dos.tenants_registry', count(*) FROM platform_dos.tenants_registry
UNION ALL SELECT 'platform_dos.tenant_products', count(*) FROM platform_dos.tenant_products
UNION ALL SELECT 'platform_dos.tenant_product_modules', count(*) FROM platform_dos.tenant_product_modules
UNION ALL SELECT 'dos.tenants', count(*) FROM dos.tenants
UNION ALL SELECT 'public.tenants', count(*) FROM public.tenants
UNION ALL SELECT 'physical tenant_* schemas', count(*) FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%';
```

---

## 2. Matched registry → schema (8)

Match is computed by normalizing `tenant_id` (lower-case, hyphens stripped) against `regexp_replace(schema_name,'^tenant_','')`. `tenant_provisioning_jobs` is **empty** so `last_job` is NULL throughout.

| registry tenant_id | schema | display_name | product_code | status | created_at | last_job | classification |
|---|---|---|---|---|---|---|---|
| `dogan` | `tenant_dogan` | dogan | shahin | active | 2026-04-23 06:06:07Z | NULL | **active** (canonical demo) |
| `2c71cc2d-6728-4394-b2c4-02ac087bba82` | `tenant_2c71cc2d…` | Dpgan Consult | shahin-ai | active | 2026-04-25 15:07:58Z | NULL | **duplicate** (typo of "Dogan", twin of row below) |
| `76ce30e4-1683-41d0-9913-919227afdf1a` | `tenant_76ce30e4…` | E2E Test Co 1777020322813 | shahin-ai | active | 2026-04-25 15:07:58Z | NULL | **test** (E2E harness) |
| `a765b0362188` | `tenant_a765b0362188` | E2E Probe Company | shahin-ai | active | 2026-04-25 15:07:58Z | NULL | **test** (E2E probe) |
| `d28556d1-6acd-46b7-9b2f-170ad3b5cfb8` | `tenant_d28556d1…` | Hehheh | shahin-ai | active | 2026-04-25 15:07:58Z | NULL | **test** (placeholder name) |
| `shahin_visitors` | `tenant_shahin_visitors` | Shahin-Ai Visitors | shahin-ai | active | 2026-04-25 15:07:58Z | NULL | **visitor** (anonymous-visitor sandbox) |
| `2ba4b532-3361-413c-ac6c-9c992f66bec4` | `tenant_2ba4b532…` | Dpgan Consult | shahin-ai | active | 2026-04-25 20:27:26Z | NULL | **duplicate** (twin of 2c71cc2d…) |
| `84387f0b-783a-47f7-8cf1-f844b31ad286` | `tenant_84387f0b…` | werwerwer | shahin-ai | active | 2026-04-25 21:37:00Z | NULL | **test** (keyboard-mash name) |

Read-only SQL: see Appendix A — Q2.

---

## 3. Registry rows with NO physical schema (48 orphans)

For every orphan: `status='active'`, `product_code='shahin'`, `tp_status='active'`, `tpm_count=51`, `last_job=NULL`, `last_err=NULL`. All 48 were created in a single batch on 2026-04-23 06:06:04→07Z (≈ 3 seconds), strongly indicating a **bulk-seed/test fixture** that bypassed the schema-create step.

### 3.1 Bulk-batch (45 × 12-char hex stubs) — proposed `orphan_provisioning_failed` OR `test_stub`

```
003d6d1f266e   084e492569fb   088998ce759f   0a1cdbfe41d5   0aab56662691
0b39d8d1a9a6   0c9af04e4243   13e91c72b4e4   1eb4087dfdcc   2856df9a8b63
2963efa656f1   2e6957b63d7b   31b12d374efd   323e23ad3e67   45a199b1e41b
46007594e959   4f83bed8eb1d   54163fe24f23   5585ee20292f   56b8b9370073
64365928abfa   67da4d9d260c   762682747b1b   7848c0325342   78db092c8ad7
8877128dc850   909f6ca6988c   9c8f47c64767   a25de2b0871b   a653f3c71896
ad2b81baf07b   af0e7d27ab67   b1f0df8beac7   b56613950751   b9bcb9d0c75d
c359c313958f   c387757bf473   d2d4f1869096   dcbc20b03704   de6e72d188fe
e3b0e51dba13   e87836841d17   eae7368cc0f3   eef2865f31c6   ffdcba7e2a72
```

All 45 share: `display_name == tenant_id`, `product_code='shahin'`, `tpm_count=51`, no schema, no provisioning job. → **Proposed classification:** `orphan_provisioning_failed`. Sub-tag `bulk_seed_2026-04-23` (single-batch origin).

### 3.2 Named test stubs (3) — proposed `test_stub`

| tenant_id | display_name | tpm_count | proposed |
|---|---|---|---|
| `rimtest1776461709` | rimtest1776461709 | 51 | `test_stub` (timestamp suffix = epoch ms; harness origin) |
| `tenta` | tenta | 51 | `test_stub` |
| `tentb` | tentb | 51 | `test_stub` |

### 3.3 Tenant-product-modules residue

Every orphan registry row has **51 rows** in `tenant_product_modules` (48 × 51 = 2448 rows), inflating the canonical 2499 figure. The 8 matched tenants account for the remaining 51 rows (`dogan` only — see §6). After Phase 2A actions are applied, `tenant_product_modules` should converge to ~408 (8 matched tenants × 51 modules) — but **no deletion is proposed in this gate.**

Read-only SQL: see Appendix A — Q3.

---

## 4. Physical schemas with NO registry row (5 dangling)

| schema | tables | approx size | obvious identity | proposed classification |
|---|---:|---:|---|---|
| `tenant_51f36271df62ea3d` | 1854 | 45 MB | matches `dos.tenants` row "Info Dogan Consult workspace" (`tenant_id=51f36271df62ea3d`, `tenant_code=doganconsultcom`) — **registry row missing** | `legacy_schema` (orphan but real customer footprint) |
| `tenant_a7f7b3f6f0df` | 1854 | 45 MB | matches `dos.tenants` "Tenant a7f7b3f6f0df" + `public.tenants` "AcceptanceCo1777152936e77976" | `dangling_test_schema` (acceptance harness) |
| `tenant_douhan_consult` | 1854 | 45 MB | matches `dos.tenants` "Douhan Consult (dev)" + `public.tenants` "Dogan Consult" (dev twin of `tenant_dogan`) | `legacy_schema` (dev sibling of canonical `tenant_dogan`) |
| `tenant_f2a45bc25f31` | 1865 | 46 MB | matches `dos.tenants` "Tenant f2a45bc25f31" + `public.tenants` "stc-mofg3saq" | `dangling_test_schema` (stc probe) |
| `tenant_validate_migrations` | 1853 | 45 MB | name self-identifies | `validation_schema` (migration-runner sentinel) |

Read-only SQL: see Appendix A — Q4.

---

## 5. Duplicate / near-duplicate identity

### 5.1 Same display_name in `platform_dos.tenants_registry`

Only one duplicate group:

| normalized name | rows | tenant_ids |
|---|---:|---|
| `dpgan consult` | 2 | `2c71cc2d-6728-4394-b2c4-02ac087bba82`, `2ba4b532-3361-413c-ac6c-9c992f66bec4` |

Both have physical schemas. Both are misspellings of "**Dogan**". **Recommendation:** keep ONE (whichever has the most data on inspection — to be measured in Phase 2B), rename `display_name` to "Dogan Consult", retire the other.

### 5.2 "Dogan" / "Dpgan" / "Douhan" cluster (across all tenant tables)

| Variant | Locations | Likely intent |
|---|---|---|
| `Dogan Consult (smoke/dev)` (`dogan`) | registry+`dos.tenants`+`public.tenants`+schema | **canonical** — keep |
| `Douhan Consult (dev)` (`douhan_consult`) | `dos.tenants`+`public.tenants`+schema, **NOT in registry** | dev twin — backfill registry row OR retire |
| `Dpgan Consult` × 2 (`2c71cc2d…`, `2ba4b532…`) | registry+schema (no `dos.tenants` rows) | mistyped "Dogan" — collapse to one |
| `Info Dogan Consult workspace` (`51f36271df62ea3d`) | `dos.tenants`+schema, **NOT in registry**, **NOT in public.tenants** | legacy onboarding artefact |
| ~16 rows `Ahmet Dogan workspace` / `Ahsetrswetr… Dwtwetewt…` (random tenant_ids) | `dos.tenants` only — no schema, no registry | onboarding form spam — Phase 2B candidates |
| `Visitor Shahin-AI workspace`, `Visitor046 Dogan Consult workspace`, `Visitor 028 Dogan Consult workspace` | `dos.tenants` only | onboarding spam |

### 5.3 E2E / test cluster

| Variant | Locations |
|---|---|
| `E2E Probe Company` (`a765b0362188`) | registry+`dos.tenants`+`public.tenants`+schema — **fully wired test tenant** |
| `E2E Test Co 1777020322813` (`76ce30e4…`) | registry+`public.tenants`+schema (NOT in `dos.tenants`) |
| `E2E Test Org workspace` (`ad49692a66899912`) | `dos.tenants` only |
| `E2E User1777020322813 workspace` (`618458a5e17306ce`) | `dos.tenants` only |
| `Smoke Test workspace` (`t_smoketest-17`) | `dos.tenants` only |
| `TestUser workspace` (`t_test_sub_123`) | `dos.tenants` only |
| `Test Org 1777192584` (`aaa7c7c7cf9f`) | `public.tenants` only |
| `Final Verify Org workspace` (`cf4b5a3d6d7ac8f9`) | `dos.tenants` only |
| `Legacy Workspace` (`ltcf89c3cd79100e`) | `dos.tenants` only |
| `WaveProof Co` (`761c298cd0b6`) | `public.tenants` only |
| `werwerwer` (`84387f0b…`) | registry+`public.tenants`+schema |
| `Hehheh` (`d28556d1…`) | registry+`public.tenants`+schema |
| `srtsertesrtf werswerwesr workspace` (`8f3d08c15271bbd6`) | `dos.tenants` only |
| `see dxx workspace` (`14f273cf260a4736`) | `dos.tenants` only |
| `tenta`, `tentb`, `rimtest…` | registry only (orphan stubs §3.2) |
| `tenant_validate_migrations` (schema only) | dangling §4 |

**Recommended canonical tenant identities (post-cleanup):**
1. `dogan` → "Dogan Consult (demo)"
2. ONE of `2c71cc2d…` or `2ba4b532…` → "Dogan Consult" (real customer; pick by data volume)
3. `shahin_visitors` → "Shahin-AI Visitors" (visitor sandbox)
4. `a765b0362188` → "E2E Probe Company" (canonical E2E)
5. `tenant_validate_migrations` → keep as migration sentinel (back-fill registry row)

Everything else listed above should ultimately be classified `test`, `orphan`, or `legacy` — but **no action in this gate**.

---

## 6. Activation consistency (mismatches only)

Format flags: `has_tp` / `tpm_n` / `has_schema` / `in_dos` / `in_public`.

### 6.1 Matched-with-schema tenants (8) — mismatches in cross-schema tenant tables

| tenant_id | display_name | tp | tpm | schema | dos.tenants | public.tenants | mismatch |
|---|---|:-:|---:|:-:|:-:|:-:|---|
| `dogan` | dogan | ✓ | 51 | ✓ | ✓ | ✓ | **none** (only fully-consistent tenant) |
| `2ba4b532-…` | Dpgan Consult | ✓ | **0** | ✓ | ✗ | ✓ | tpm=0, missing in `dos.tenants` |
| `2c71cc2d-…` | Dpgan Consult | ✓ | **0** | ✓ | ✗ | ✓ | tpm=0, missing in `dos.tenants` |
| `a765b0362188` | E2E Probe Company | ✓ | **0** | ✓ | ✓ | ✓ | tpm=0 |
| `76ce30e4-…` | E2E Test Co | ✓ | **0** | ✓ | ✗ | ✓ | tpm=0, missing in `dos.tenants` |
| `d28556d1-…` | Hehheh | ✓ | **0** | ✓ | ✗ | ✓ | tpm=0, missing in `dos.tenants` |
| `shahin_visitors` | Shahin-Ai Visitors | ✓ | **0** | ✓ | ✗ | ✓ | tpm=0, missing in `dos.tenants` |
| `84387f0b-…` | werwerwer | ✓ | **0** | ✓ | ✗ | ✓ | tpm=0, missing in `dos.tenants` |

**Critical anomaly:** every matched tenant *except* `dogan` has **zero** `tenant_product_modules` rows yet is reported `active`. The 2499 module rows live almost entirely on the 48 orphan registry stubs (45 hex + 3 named × 51 modules each = 2448) plus `dogan` (51) → 2499 total. **The activation pipeline wrote module entitlements to phantom tenants and not to the real ones.**

### 6.2 Orphan registry rows (48) — full mismatch

All 48 orphans report `tp=true / tpm=51 / schema=false / in_dos=false / in_public=false` (see §3 — same row-set). Activation rows exist; backing schema and operational tenant rows do not.

### 6.3 Dangling schemas (5) — partial mismatch

| schema → inferred tenant_id | in registry | in dos.tenants | in public.tenants |
|---|:-:|:-:|:-:|
| `tenant_51f36271df62ea3d` | ✗ | ✓ (`51f36271df62ea3d`) | ✗ |
| `tenant_a7f7b3f6f0df` | ✗ | ✓ (`a7f7b3f6f0df`) | ✓ (`a7f7b3f6f0df`) |
| `tenant_douhan_consult` | ✗ | ✓ (`douhan_consult`) | ✓ (`douhan_consult`) |
| `tenant_f2a45bc25f31` | ✗ | ✓ (`f2a45bc25f31`) | ✓ (`f2a45bc25f31`) |
| `tenant_validate_migrations` | ✗ | ✗ | ✗ |

### 6.4 `dos.tenants` rows with NO schema (≈25)

`dos.tenants` carries 33 rows; 8 map to physical schemas (the matched §2 set + `51f36271df62ea3d`/`a7f7b3f6f0df`/`douhan_consult`/`f2a45bc25f31`). The remaining ≈25 rows are all `Ahmet Dogan workspace` / `Visitor … workspace` / `E2E … workspace` form-spam rows with random `tenant_id`s, none of which appear in `tenants_registry` or have schemas. Origin: onboarding-service — not Foundation. Cleanup is out of Foundation's scope.

Read-only SQL: see Appendix A — Q6.

---

## 7. Proposed remediation plan (NOT applied)

### 7.1 Rows to mark `orphan_provisioning_failed` (45)

All §3.1 12-char-hex stubs. Same identical signature (single-batch, no schema, 51 phantom tpm rows).

### 7.2 Rows to mark `test_stub` (3)

`rimtest1776461709`, `tenta`, `tentb`.

### 7.3 Rows to mark `test` (5 of the matched-with-schema)

`76ce30e4-…` (E2E Test Co), `a765b0362188` (E2E Probe), `d28556d1-…` (Hehheh), `84387f0b-…` (werwerwer), `shahin_visitors` (visitor sandbox).

### 7.4 Rows to mark `duplicate_of` (1)

ONE of `2c71cc2d-…` / `2ba4b532-…` → `duplicate_of=<the kept one>`. Decision deferred to Phase 2B (data-volume measurement required).

### 7.5 Schemas to quarantine (5)

All §4 dangling. Quarantine = read-only flag + no app routing, NOT drop. 7-day soak before drop, after backup.

### 7.6 Registry rows to back-fill (4)

For 4 of the 5 dangling schemas that have a `dos.tenants` echo: `51f36271df62ea3d`, `a7f7b3f6f0df`, `douhan_consult`, `f2a45bc25f31`. Back-fill `tenants_registry` from `dos.tenants` (`tenant_id`, `tenant_code`, `tenant_name`, `schema_name`) before quarantine, so registry becomes the unambiguous source of truth.

### 7.7 Tenants that should remain active

| tenant_id | reason |
|---|---|
| `dogan` | canonical demo; only fully-consistent tenant in the system |
| ONE of `2c71cc2d-…` / `2ba4b532-…` | only plausible real customer ("Dogan Consult"); pick winner by data volume |
| `shahin_visitors` | required visitor sandbox |
| `tenant_validate_migrations` | required migration-runner sentinel (back-fill registry row first) |

### 7.8 Proposed `schema_status` enum

```text
schema_status ENUM(
  'active',                      -- registry ↔ schema ↔ dos.tenants ↔ public.tenants all consistent
  'active_partial',              -- registry ↔ schema present; cross-table rows missing
  'active_duplicate',            -- two registry rows resolve to the same business identity
  'orphan_provisioning_failed',  -- registry row, no schema, no provisioning evidence
  'test_stub',                   -- registry row used by automated test harness
  'test',                        -- real tenant created for E2E/QA, has schema
  'visitor_sandbox',             -- shared anonymous-visitor tenant
  'legacy',                      -- predates current provisioning contract; back-fill required
  'dangling_schema',             -- physical schema with no registry row
  'validation_schema',           -- migration validation harness
  'quarantined',                 -- soft-deleted, no app routing, awaiting drop
  'archived'                     -- physically dropped after backup
)
```

Add `schema_status` (NOT NULL, default `'active'`) and `schema_status_reason TEXT` to `platform_dos.tenants_registry`. **Not applied in this gate.**

### 7.9 Provisioning hard-fail (root cause)

`platform_dos.tenant_provisioning_jobs` is **empty (0 rows)** despite 56 registry rows and 13 physical schemas — the table is never written. Until provisioning emits a job row per attempt with `status` (success/failed) and `error_message`, future orphan stubs cannot be diagnosed. **Required change (Phase 2C):** make `platform_dos.tenant_provisioning_jobs` insertion mandatory in the provisioning workflow; rollback registry row + tenant_products + tenant_product_modules on schema-create failure.

---

## 8. Final verdict

| Gate | Verdict | Reason |
|------|:-:|--------|
| **TENANT_TRUTH_READY** | **NO** | 56 registry / 33 dos.tenants / 15 public.tenants / 13 physical schemas — 4 disjoint sources of truth; only `dogan` is fully consistent. |
| **SAFE_TO_ADD_SCHEMA_STATUS_COLUMN** | **YES** (additive only) | Adding a NULLABLE or DEFAULT-`'active'` column to `tenants_registry` is non-breaking; readers without the column ignore it. **Caveat:** must NOT add NOT-NULL-without-default in same migration. Defer to Phase 2B. |
| **SAFE_TO_MARK_ORPHANS** | **NO** (yet) | 45 hex stubs + 3 named stubs are unambiguous, but `dos.tenants` ≈25-row residue and tenant_product_modules phantom-rows must be inventoried first. Marking without simultaneously cleaning `tenant_product_modules` would entrench the inconsistency. |
| **SAFE_TO_QUARANTINE_DANGLING_SCHEMAS** | **NO** (yet) | 4 of 5 dangling schemas have `dos.tenants` echoes; one (`tenant_51f36271df62ea3d`, "Info Dogan Consult workspace") could be a real customer. Backup + registry back-fill required first; only `tenant_validate_migrations` is unambiguously safe to quarantine immediately. |

**Aggregate gate:** **NOT READY** to proceed to data-mutating Phase 2B. Recommended next step: extend §7.4 with a data-volume measurement query (still read-only) to choose the canonical "Dogan Consult" tenant, then prepare the `schema_status` migration as a separate reviewable artefact.

---

## Appendix A — Read-only SQL used

### Q1 — counts

(see §1 block above)

### Q2 — matched registry ↔ schema

```sql
WITH schemas AS (
  SELECT schema_name, regexp_replace(schema_name,'^tenant_','') AS norm
  FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%'
),
reg AS (
  SELECT tenant_id, display_name, product_code, status, registered_at,
         lower(regexp_replace(tenant_id,'-','','g')) AS norm
  FROM platform_dos.tenants_registry
)
SELECT r.tenant_id, s.schema_name, r.display_name, r.product_code, r.status, r.registered_at,
       (SELECT status FROM platform_dos.tenant_provisioning_jobs j
        WHERE j.tenant_id=r.tenant_id ORDER BY created_at DESC LIMIT 1) AS last_job
FROM reg r JOIN schemas s ON r.norm=s.norm
ORDER BY r.registered_at;
```

### Q3 — registry rows with no physical schema

```sql
WITH schemas AS (
  SELECT regexp_replace(schema_name,'^tenant_','') AS norm
  FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%'
),
reg AS (
  SELECT tenant_id, display_name, product_code, status, registered_at,
         lower(regexp_replace(tenant_id,'-','','g')) AS norm
  FROM platform_dos.tenants_registry
)
SELECT r.tenant_id, r.display_name, r.status, r.product_code, r.registered_at,
       (SELECT status FROM platform_dos.tenant_products p WHERE p.tenant_id=r.tenant_id LIMIT 1) AS tp_status,
       (SELECT count(*) FROM platform_dos.tenant_product_modules m WHERE m.tenant_id=r.tenant_id) AS tpm_count,
       (SELECT status FROM platform_dos.tenant_provisioning_jobs j
        WHERE j.tenant_id=r.tenant_id ORDER BY created_at DESC LIMIT 1) AS last_job,
       (SELECT error_message FROM platform_dos.tenant_provisioning_jobs j
        WHERE j.tenant_id=r.tenant_id ORDER BY created_at DESC LIMIT 1) AS last_err
FROM reg r LEFT JOIN schemas s ON r.norm=s.norm
WHERE s.norm IS NULL
ORDER BY r.registered_at;
```

### Q4 — physical schemas with no registry row

```sql
WITH schemas AS (
  SELECT schema_name, regexp_replace(schema_name,'^tenant_','') AS norm
  FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%'
),
reg AS (
  SELECT lower(regexp_replace(tenant_id,'-','','g')) AS norm
  FROM platform_dos.tenants_registry
)
SELECT s.schema_name,
       (SELECT count(*) FROM information_schema.tables t WHERE t.table_schema=s.schema_name) AS table_count,
       pg_size_pretty(COALESCE(
         (SELECT SUM(pg_total_relation_size(quote_ident(s.schema_name)||'.'||quote_ident(t.tablename)))
          FROM pg_tables t WHERE t.schemaname=s.schema_name), 0)) AS approx_size
FROM schemas s LEFT JOIN reg r ON s.norm=r.norm
WHERE r.norm IS NULL
ORDER BY s.schema_name;
```

### Q5 — duplicate display_name in registry

```sql
SELECT lower(trim(display_name)) AS norm_name, count(*) AS n,
       string_agg(tenant_id||'  status='||status||'  prod='||product_code,' || ') AS rows
FROM platform_dos.tenants_registry
GROUP BY lower(trim(display_name))
HAVING count(*)>1
ORDER BY n DESC, norm_name;
```

### Q5b/Q5c — cross-table tenant identities

```sql
SELECT tenant_id::text, tenant_code, tenant_name, schema_name, status FROM dos.tenants ORDER BY tenant_name;
SELECT tenant_id::text, tenant_code, COALESCE(tenant_name_en,org_name), schema_name, status
FROM public.tenants ORDER BY 3;
```

### Q6 — activation consistency

```sql
WITH schemas AS (
  SELECT regexp_replace(schema_name,'^tenant_','') AS norm
  FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%'
),
reg AS (
  SELECT tenant_id, display_name, lower(regexp_replace(tenant_id,'-','','g')) AS norm
  FROM platform_dos.tenants_registry
)
SELECT r.tenant_id, r.display_name,
       (SELECT count(*)>0 FROM platform_dos.tenant_products tp WHERE tp.tenant_id=r.tenant_id) AS has_tp,
       (SELECT count(*)   FROM platform_dos.tenant_product_modules tpm WHERE tpm.tenant_id=r.tenant_id) AS tpm_n,
       (s.norm IS NOT NULL) AS has_schema,
       (SELECT count(*)>0 FROM dos.tenants    dt WHERE dt.tenant_id::text=r.tenant_id OR dt.tenant_code=r.tenant_id) AS in_dos,
       (SELECT count(*)>0 FROM public.tenants pt WHERE pt.tenant_id::text=r.tenant_id OR pt.tenant_code=r.tenant_id) AS in_public
FROM reg r LEFT JOIN schemas s ON r.norm=s.norm
ORDER BY has_schema DESC, r.display_name;
```

### Q-jobs — provisioning job evidence

```sql
SELECT count(*) FROM platform_dos.tenant_provisioning_jobs;  -- => 0 (table empty)
```
