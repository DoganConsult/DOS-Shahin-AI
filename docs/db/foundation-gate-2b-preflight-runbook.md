# Foundation DB Gate 2B-R1 — Preflight Capture + Static Review Runbook

**Mode:** READ-ONLY + STATIC REVIEW. No migration was applied. No DDL/DML executed against live DB. No RLS change.
**Source artifacts:** `ops/migrations/20260430_000{1,2,3,4}_*.sql` + `docs/db/foundation-gate-2b-review.md`.
**Predecessor gates:** [`_phase1-foundation-gate.md`](../../DOS-AIO-Specs/audit/modules/_phase1-foundation-gate.md) → [`_phase1-foundation-gate-2a.md`](../../DOS-AIO-Specs/audit/modules/_phase1-foundation-gate-2a.md) → [`_phase1-foundation-gate-2a-1.md`](../../DOS-AIO-Specs/audit/modules/_phase1-foundation-gate-2a-1.md).

---

## 1. Immutable artifact metadata

**Git commit (HEAD at preflight capture):** `86fb55866af81399f6d0829feb22b52c4765346e`

**Working-tree status (relevant entries only):**
- Untracked: `ops/migrations/20260430_0001_foundation_tenant_schema_status.sql`
- Untracked: `ops/migrations/20260430_0002_archive_phantom_tenant_product_modules.sql`
- Untracked: `ops/migrations/20260430_0003_foundation_mark_orphan_registry_rows.sql`
- Untracked: `ops/migrations/20260430_0004_foundation_backfill_dangling_schemas.sql`
- Untracked: `docs/db/` (this runbook + `foundation-gate-2b-review.md`)
- Untracked: `DOS-AIO-Specs/audit/modules/_phase1-foundation-gate-2a-1.md`
- Other tracked-modified files in working tree are unrelated to Phase 2B (gateway/server, ports allocation, ecosystem, canonical-permissions, pnpm-lock, foundation-data.service).

**SHA256 of artifact files:**

| File | SHA256 |
|------|--------|
| `ops/migrations/20260430_0001_foundation_tenant_schema_status.sql`            | `be63c8ebe8c03b8adcd3d0dc2253e695fa392d915585ecaa9e7f4d9d45cf9046` |
| `ops/migrations/_rejected/20260430_0002_archive_phantom_tenant_product_modules.sql.rejected` ¹ | `65bb31731e8daeb983c0eb57ba141c0d230fca787264e09cd11dfe5a8b6078a9` |
| `ops/migrations/20260430_0002a_archive_phantom_tenant_product_modules_fixed.sql` ² | `b1a7753fb6705e32e6f42aeaaed48c21c291cc56a6e2ad99134a9043dd796ee0` |
| `ops/migrations/20260430_0003_foundation_mark_orphan_registry_rows.sql`       | `a6b0e894ddb1e6a82ae0095ab591e1f95532c249aa42e9351db2791884f647fd` |
| `ops/migrations/20260430_0004_foundation_backfill_dangling_schemas.sql`       | `7f31e25ea187cee239983ea9c0b1f82192c84ad9a5cccb4327fb8e209d502961` |
| `docs/db/foundation-gate-2b-review.md`                                        | `17eea9ca672d16bae0bab0a606bbf7f8f5f678fd4ecaa3b21c1d2a65783d7a53` |

¹ The original `0002` was rejected at parse time on staging — Step 5 embedded `RAISE NOTICE` inside a SQL scalar expression, which is invalid. The `BEGIN` opened but never reached `COMMIT`, so zero objects/rows were committed. The file is retained under `_rejected/` for evidence and **must not be applied**.

² `0002a` is the full replacement for the rejected `0002`. Behavioral envelope is unchanged (archive-then-delete the 2,448 phantom rows for the 48 orphan tenants, with the same five abort guards). Step 5 was rewritten using a `WITH del AS (DELETE …)` capture into a temp table followed by a `DO $$` block for `RAISE NOTICE` / `RAISE EXCEPTION`. Phase 2B-S2 staging rehearsal of `0002a`: PASS — see [`foundation-gate-2b-s2-rehearsal.md`](foundation-gate-2b-s2-rehearsal.md).

Re-run `sha256sum` against these files immediately before staging-rehearsal and again before production-apply. **Any drift = abort and re-issue gate.**

---

## 2. Live DB preflight output (read-only)

PostgreSQL 18 @ `127.0.0.1:5432/shahin_grc`, captured at preflight gate run.

| Probe | Observed | Expected | Result |
|---|---:|---:|:-:|
| `platform_dos.tenants_registry` rows | **56** | 56 | OK |
| `platform_dos.tenant_products` rows | **56** | 56 | OK |
| `platform_dos.tenant_product_modules` rows | **2499** | 2499 | OK |
| Physical `tenant_*` schemas | **13** | 13 | OK |
| Orphan registry rows (no schema) | **48** | 48 | OK |
| Phantom `tpm` rows for the 48 orphans | **2448** | 2448 | OK |
| 12-char-hex orphan rows | **45** | 45 | OK |
| Named test stubs (`rimtest1776461709`,`tenta`,`tentb`) | **3** | 3 | OK |
| Foreign keys referencing `tenant_product_modules` | **0** | 0 | OK |
| 4 dangling schemas still present | **4** | 4 | OK |
| Excluded `tenant_51f36271df62ea3d` schema present | **1** | 1 | OK |
| Dpgan tenants in registry | **2** | 2 | OK |
| Onboarding-spam `dos.tenants` rows (no registry, no schema) | **27** | 27 | OK |
| `schema_status` column already present | **0** | 0 | OK |

**Verdict:** all 14 invariants match the Gate 2A.1 baseline exactly.

### 2.1 Read-only SQL used

```sql
-- 1. core counts
SELECT 'tenants_registry'              , count(*) FROM platform_dos.tenants_registry
UNION ALL SELECT 'tenant_products'      , count(*) FROM platform_dos.tenant_products
UNION ALL SELECT 'tenant_product_modules', count(*) FROM platform_dos.tenant_product_modules
UNION ALL SELECT 'physical_tenant_schemas', count(*) FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%';

-- 2. orphan + phantom invariants
WITH schemas AS (
  SELECT lower(regexp_replace(schema_name,'^tenant_','')) AS norm
  FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%'
),
orphans AS (
  SELECT r.tenant_id FROM platform_dos.tenants_registry r
  WHERE NOT EXISTS (SELECT 1 FROM schemas s
                    WHERE s.norm = lower(regexp_replace(r.tenant_id,'-','','g')))
)
SELECT 'orphan_count'   , count(*) FROM orphans
UNION ALL
SELECT 'phantom_tpm_rows', count(*) FROM platform_dos.tenant_product_modules t
  WHERE t.tenant_id IN (SELECT tenant_id FROM orphans)
UNION ALL
SELECT 'hex_orphans',     count(*) FROM platform_dos.tenants_registry
  WHERE tenant_id ~ '^[0-9a-f]{12}$' AND tenant_id IN (SELECT tenant_id FROM orphans)
UNION ALL
SELECT 'named_test_stubs', count(*) FROM platform_dos.tenants_registry
  WHERE tenant_id IN ('rimtest1776461709','tenta','tentb');

-- 3. FK pointing TO tenant_product_modules
SELECT count(*) FROM pg_constraint c
JOIN pg_class cf ON cf.oid=c.confrelid JOIN pg_namespace nf ON nf.oid=cf.relnamespace
WHERE c.contype='f' AND nf.nspname='platform_dos' AND cf.relname='tenant_product_modules';

-- 4. dangling schemas still present
SELECT count(*) FROM information_schema.schemata
WHERE schema_name IN ('tenant_a7f7b3f6f0df','tenant_douhan_consult',
                      'tenant_f2a45bc25f31','tenant_validate_migrations');

-- 5. excluded tenant_51f36271df62ea3d still present
SELECT count(*) FROM information_schema.schemata WHERE schema_name='tenant_51f36271df62ea3d';

-- 6. Dpgan tenants still in registry
SELECT count(*) FROM platform_dos.tenants_registry
WHERE tenant_id IN ('2c71cc2d-6728-4394-b2c4-02ac087bba82','2ba4b532-3361-413c-ac6c-9c992f66bec4');

-- 7. onboarding spam in dos.tenants (no registry no schema)
WITH schemas AS (
  SELECT lower(regexp_replace(schema_name,'^tenant_','')) AS norm
  FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%'
)
SELECT count(*) FROM dos.tenants dt
WHERE NOT EXISTS (SELECT 1 FROM platform_dos.tenants_registry r WHERE r.tenant_id=dt.tenant_id)
  AND NOT EXISTS (SELECT 1 FROM schemas s WHERE s.norm=lower(regexp_replace(dt.tenant_id,'-','','g')));

-- 8. schema_status column existence (must be 0 — not yet applied)
SELECT count(*) FROM information_schema.columns
WHERE table_schema='platform_dos' AND table_name='tenants_registry' AND column_name='schema_status';
```

### 2.2 Excluded-scope reference scan

`grep -lE "51f36271df62ea3d|2c71cc2d|2ba4b532|Ahmet Dogan|Visitor.*workspace" ops/migrations/20260430_000*.sql` matches **only** `0004` at lines 20 and 27 — both inside the SAFETY CONTRACT comment block that **lists exclusions**, not as DML targets. Verified by `grep -nE`. No mutation in any of the 4 drafts targets the excluded scope.

---

## 3. Static review of the 4 drafts

### 3.1 `0001_foundation_tenant_schema_status.sql`

| Property | Value |
|---|---|
| Transactional | YES (BEGIN…COMMIT) |
| Hard invariant guards | n/a — additive only; safety enforced by `IF NOT EXISTS` and `NOT VALID` constraints |
| Idempotent | YES (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `IF NOT EXISTS` constraint guards) |
| Rollback SQL exists | YES — column drops (file footer) |
| Expected affected rows | 0 row UPDATEs (DEFAULT applied via column add) |
| Tables touched | `platform_dos.tenants_registry` (ALTER ADD COLUMN ×5; ADD CHECK NOT VALID; ADD self-FK NOT VALID; CREATE INDEX) |
| Excluded scopes | All — pure schema change |
| Abort conditions | No explicit RAISE; relies on Postgres ALTER semantics |

### 3.2 `0002_archive_phantom_tenant_product_modules.sql`

| Property | Value |
|---|---|
| Transactional | YES (single BEGIN…COMMIT) |
| Hard invariant guards | YES — `RAISE EXCEPTION` if `orphan_count != 48`, `phantom_tpm != 2448`, archive coverage incomplete, or post-DELETE residual `!= 0` |
| Idempotent | YES (archive write skips already-archived rows by `(tenant_id,product_code,module_code,archive_reason)` triple; DELETE re-run finds 0 rows) |
| Rollback SQL exists | YES — re-INSERT from archive (file footer) |
| Expected affected rows | archive +2448, live −2448 |
| Tables touched | `platform_dos.tenant_product_modules_archive` (CREATE+INSERT), `platform_dos.tenant_product_modules` (DELETE) |
| Excluded scopes | All non-orphan tenants (only the 48 orphans matched dynamically) |
| Abort conditions | gate2b_orphans count != 48; phantom count != 48×51; archive < live; residual != 0 |

### 3.3 `0003_foundation_mark_orphan_registry_rows.sql`

| Property | Value |
|---|---|
| Transactional | YES |
| Hard invariant guards | YES — `RAISE EXCEPTION` if hex matched != 45, named matched != 3, or any allow-listed tenant has acquired a physical schema; pre-flight check for `schema_status` column |
| Idempotent | YES (`WHERE r.schema_status IS DISTINCT FROM <target>`) |
| Rollback SQL exists | YES (file footer) |
| Expected affected rows | 48 UPDATEs (45+3) |
| Tables touched | `platform_dos.tenants_registry` (UPDATE only) |
| Excluded scopes | dogan, all 8 matched-schema tenants, all 5 dangling schemas, both Dpgan, all onboarding spam — none referenced in allow-lists |
| Abort conditions | Allow-list count drift; physical schema appears for an allow-listed tenant; missing `schema_status` column |

### 3.4 `0004_foundation_backfill_dangling_schemas.sql`

| Property | Value |
|---|---|
| Transactional | YES |
| Hard invariant guards | YES — `RAISE EXCEPTION` if `schema_status` column missing, any of 4 schemas missing, or any conflicting `schema_status` already present on the 4 target tenant_ids; postflight verifies all 4 inserted with expected status |
| Idempotent | YES (`ON CONFLICT (tenant_id) DO NOTHING`) |
| Rollback SQL exists | YES — `DELETE … WHERE attributes->>'backfill_source'='gate-2b'` (file footer) |
| Expected affected rows | 4 INSERTs |
| Tables touched | `platform_dos.tenants_registry` (INSERT only) |
| Excluded scopes | `tenant_51f36271df62ea3d` (manual review), Dpgan, onboarding spam — not in INSERT VALUES list |
| Abort conditions | Missing column; missing schema; pre-existing unexpected `schema_status` on a target row; postflight row count != 4 |

**Static review verdict:** PASS. All four drafts are transactional, idempotent, and carry inline rollback SQL; three of four ship explicit invariant guards (`0001` is additive-only and does not need them).

---

## 4. Apply order

`0001 → 0002 → 0003 → 0004` is **confirmed**.

- `0003` and `0004` both contain a runtime check that aborts if the `schema_status` column added by `0001` is missing.
- `0003` should run after `0002` because (a) the orphan/phantom invariant in `0002` is verified against the same orphan set as `0003`'s allow-list, and (b) marking orphans before clearing the phantom rows complicates evidence trails.
- `0004` is independent of `0002`/`0003` but must run after `0001`. Running it last keeps the registry mutations grouped in one window.

---

## 5. Staging rehearsal plan

1. Snapshot staging DB (`pg_dump --schema=platform_dos --schema=dos --schema=public`) and capture `pg_basebackup` PITR marker; record into the runbook copy used in staging.
2. Re-run §2 read-only SQL against staging — confirm same invariants (counts may differ from production but **must internally agree** with each other; orphan_count == count(hex_orphans) + count(named_test_stubs); phantom_tpm == 51 × orphan_count).
3. Apply `0001` only. Run §6.1 postflight. **STOP.** Capture artifact hashes and DB diff. Tag as `gate-2b-r1-staging-0001-applied`.
4. After 0001 sign-off: apply `0002`, run §6.2 postflight. Apply `0003`, run §6.3 postflight. Apply `0004`, run §6.4 postflight.
5. Capture `before/after` count tables into the runbook for review.
6. Hold staging in this state for **48 hours** while observability/log-watch confirms no service has begun rejecting reads from the changed tables.

---

## 6. Production apply plan

Pre-conditions (every box in §8 must be checked):

1. Re-verify SHA256s match §1 verbatim.
2. Re-run §2 read-only SQL against production. Counts must match the staging baseline exactly.
3. Take production logical backup of `platform_dos.*` and confirm PITR marker.
4. Apply `0001` only inside the agreed maintenance window. Run postflight §6.1. **HOLD ≥ 30 min** to let the new column propagate through any cached schema introspection.
5. Apply `0002`. Run postflight §6.2. **HOLD ≥ 15 min.**
6. Apply `0003`. Run postflight §6.3. **HOLD ≥ 15 min.**
7. Apply `0004`. Run postflight §6.4.
8. Tag `gate-2b-r1-prod-applied` on the deploy commit. Re-snapshot artifact hashes into the runbook copy used in production.

### 6.1 Postflight after 0001
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema='platform_dos' AND table_name='tenants_registry'
  AND column_name IN ('schema_status','schema_status_reason','schema_checked_at',
                      'duplicate_of_tenant_id','archived_at')
ORDER BY column_name;                       -- expect 5 rows
SELECT schema_status, count(*) FROM platform_dos.tenants_registry GROUP BY 1;
                                            -- expect: active=56
```

### 6.2 Postflight after 0002
```sql
SELECT count(*) FROM platform_dos.tenant_product_modules;                 -- expect 51
SELECT count(*) FROM platform_dos.tenant_product_modules_archive
  WHERE archive_reason='orphan_provisioning_failed_bulk_seed_2026_04_23';  -- expect 2448
```

### 6.3 Postflight after 0003
```sql
SELECT schema_status, count(*) FROM platform_dos.tenants_registry GROUP BY 1 ORDER BY 1;
-- expect: active=8, orphan_provisioning_failed=45, test_stub=3
```

### 6.4 Postflight after 0004
```sql
SELECT tenant_id, schema_status FROM platform_dos.tenants_registry
WHERE tenant_id IN ('a7f7b3f6f0df','douhan_consult','f2a45bc25f31','validate_migrations')
ORDER BY tenant_id;                                          -- expect 4 rows
SELECT count(*) FROM platform_dos.tenants_registry;          -- expect 60
```

---

## 7. Rollback plan

| Step | Action |
|---|---|
| Pre-COMMIT abort | Each migration is wrapped in a single transaction; a `RAISE EXCEPTION` rolls back automatically with no residual state. |
| 0004 post-COMMIT | `DELETE FROM platform_dos.tenants_registry WHERE tenant_id IN ('a7f7b3f6f0df','douhan_consult','f2a45bc25f31','validate_migrations') AND attributes->>'backfill_source'='gate-2b';` |
| 0003 post-COMMIT | `UPDATE platform_dos.tenants_registry SET schema_status='active', schema_status_reason=NULL, schema_checked_at=NULL WHERE tenant_id IN (<48-row allow-list>);` |
| 0002 post-COMMIT | Re-INSERT from archive (full SQL in 0002 footer), then DELETE the matching archive rows. |
| 0001 post-COMMIT | `ALTER TABLE platform_dos.tenants_registry DROP COLUMN ...` for each added column, then `DROP INDEX tenants_registry_schema_status_idx;`. |
| Last-resort | PITR restore to the marker captured in §6 step 3 (production) / §5 step 1 (staging). |

---

## 8. Approval checklist

- [ ] Foundation owner approval (sign + date)
- [ ] DBA approval (sign + date)
- [ ] Backup / PITR marker confirmed on production
- [ ] Staging `0001` rehearsal passed (postflight §6.1 attached)
- [ ] Staging `0002`–`0004` rehearsal passed (postflights §6.2–§6.4 attached)
- [ ] Production maintenance window approved (date/time + duration)

---

## 9. Hold conditions (any one => abort)

- SHA256 of any artifact differs from §1.
- Any §2 invariant fails to match its expected value at production preflight.
- `schema_status` column already present on production prior to applying `0001`.
- Any allow-listed orphan in `0003` has acquired a physical schema between gate run and apply.
- Any of the 4 dangling schemas in `0004` is missing on production.
- `tenant_51f36271df62ea3d`, `2c71cc2d-…`, `2ba4b532-…`, or any onboarding-spam tenant_id appears in any DML target of any of the 4 migrations.
- Foundation owner or DBA approval not signed.

---

## 10. Final verdict

| Gate | Verdict |
|---|:-:|
| `PREFLIGHT_COUNTS_MATCH_EXPECTED` | **YES** (14/14) |
| `STATIC_REVIEW_PASS` | **YES** |
| `READY_FOR_STAGING_0001_ONLY` | **YES** |
| `READY_FOR_PRODUCTION_APPLY` | **NO** (production apply requires staging rehearsal of 0001–0004 + signed §8 checklist) |
