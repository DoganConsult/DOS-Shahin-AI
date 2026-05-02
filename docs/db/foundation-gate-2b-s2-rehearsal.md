# Foundation DB Gate 2B-S2 — Staging Rehearsal of 0002a

**Phase:** Foundation Reconciliation Phase 2B-S2 — Staging rehearsal of `0002a`
**Status:** **PASS**
**Mode:** STAGING REHEARSAL on `shahin_grc_gate2b_staging`. Production (`shahin_grc`) was **not** touched.
**Predecessor:** [`foundation-gate-2b-preflight-runbook.md`](foundation-gate-2b-preflight-runbook.md) (Phase 2B-R1: PASS) → Phase 2B-S1 (0001 staging apply: PASS).

---

## 1. Identity

| Field | Value |
|---|---|
| host | `127.0.0.1` |
| database | `shahin_grc_gate2b_staging` |
| postgres version | `PostgreSQL 18.3 (Ubuntu 18.3-1.pgdg22.04+1)` |
| connection role | `postgres` (superuser, peer auth via Unix socket) |
| source state at entry | post-0001 applied |
| git HEAD | `9e723f58fd2290458f8c98ba64a02428fc6577bb` |
| migration applied | [`ops/migrations/20260430_0002a_archive_phantom_tenant_product_modules_fixed.sql`](../../ops/migrations/20260430_0002a_archive_phantom_tenant_product_modules_fixed.sql) |
| migration sha256 | `b1a7753fb6705e32e6f42aeaaed48c21c291cc56a6e2ad99134a9043dd796ee0` |
| 0001 sha256 (preserved, not re-applied) | `be63c8ebe8c03b8adcd3d0dc2253e695fa392d915585ecaa9e7f4d9d45cf9046` |
| rejected predecessor (kept in `_rejected/`, never applied) | [`ops/migrations/_rejected/20260430_0002_archive_phantom_tenant_product_modules.sql.rejected`](../../ops/migrations/_rejected/20260430_0002_archive_phantom_tenant_product_modules.sql.rejected) (sha `65bb31731e8daeb983c0eb57ba141c0d230fca787264e09cd11dfe5a8b6078a9`) |
| production touched | **NO** — every psql session targeted `-d shahin_grc_gate2b_staging`; the migration file has no cross-DB references |

---

## 2. Preflight (read-only, post-0001 / pre-0002a)

| Probe | Actual | Expected | Result |
|---|---:|---:|:-:|
| `platform_dos.tenants_registry` rows | 56 | 56 | OK |
| `platform_dos.tenant_products` rows | 56 | 56 | OK |
| `platform_dos.tenant_product_modules` rows | **2499** | 2499 | OK |
| `platform_dos.tenant_product_modules_archive` | absent | absent | OK |
| Physical `tenant_*` schemas | 13 | 13 | OK |
| `orphan_count` (registry rows with no schema) | **48** | 48 | OK |
| `phantom_tpm_rows` (live tpm rows for those 48) | **2448** | 2448 | OK |
| `hex_orphans` (12-hex tenant_id) | 45 | 45 | OK |
| `named_test_stubs` (`rimtest1776461709`,`tenta`,`tentb`) | 3 | 3 | OK |
| FKs referencing `tenant_product_modules` | 0 | 0 | OK |
| `schema_status` distribution | `active=56` | `active=56` | OK |
| `schema_status_reason` populated | 0 | 0 | OK |
| `duplicate_of_tenant_id` populated | 0 | 0 | OK |
| `archived_at` populated | 0 | 0 | OK |
| `tenant_51f36271df62ea3d` schema present (excluded) | 1 | 1 | OK |
| Dpgan tenants in registry | 2 | 2 | OK |

Internal consistency check: `phantom_tpm_rows == 51 × orphan_count` → **2448 == 51 × 48** ✓

**0001 artifacts present (precondition for 0002a):**

| Object | Present | NOT VALID? |
|---|:-:|:-:|
| col `schema_status` (default `'active'`) | YES | n/a |
| col `schema_status_reason` | YES | n/a |
| col `schema_checked_at` | YES | n/a |
| col `duplicate_of_tenant_id` | YES | n/a |
| col `archived_at` | YES | n/a |
| constraint `tenants_registry_schema_status_check` | YES | YES |
| constraint `tenants_registry_duplicate_of_fk` | YES | YES |
| index `tenants_registry_schema_status_idx` | YES | n/a |

Verdict: **`STAGING_0002_PREFLIGHT_PASS = YES`**

---

## 3. Apply (first run)

```bash
sudo -u postgres psql -d shahin_grc_gate2b_staging -v ON_ERROR_STOP=1 \
  -f ops/migrations/20260430_0002a_archive_phantom_tenant_product_modules_fixed.sql
```

Window (timezone +08:00): start `2026-04-30T18:50:50`, end `2026-04-30T18:50:50` (sub-second).

Notable psql output (full log: `/tmp/2b-s2-apply1.log`):

```
BEGIN
CREATE TABLE              -- platform_dos.tenant_product_modules_archive
COMMENT
CREATE INDEX              -- tenant_product_modules_archive_tenant_idx
CREATE INDEX              -- tenant_product_modules_archive_reason_idx
DROP TABLE                -- pg_temp.gate2b_orphans (no-op on first run)
CREATE TABLE              -- pg_temp.gate2b_orphans
INSERT 0 48               -- gate2b_orphans rows
NOTICE: GATE_2B_GUARD: orphans=48, live phantom tpm rows=2448
INSERT 0 2448             -- archive copy
NOTICE: GATE_2B_ARCHIVE: live=2448 archived=2448 (archive >= live OK)
CREATE TABLE              -- pg_temp.gate2b_delete_count
INSERT 0 1
NOTICE: GATE_2B_OK: deleted 2448 phantom rows (remaining=0).
COMMIT
```

All five abort guards (`orphans=48`, `phantoms ∈ {0,2448}`, archive coverage, delete count `∈ {0,2448}`, `remaining=0`) cleared. COMMIT reached.

Verdict: **`STAGING_0002_APPLY_PASS = YES`**

---

## 4. Postflight (read-only, post-first-apply)

| Probe | Actual | Expected | Result |
|---|---:|---:|:-:|
| `platform_dos.tenant_product_modules` rows | **51** | 51 | OK |
| `tenant_product_modules_archive` total rows | **2448** | 2448 | OK |
| archive rows where `archive_reason='orphan_provisioning_failed_bulk_seed_2026_04_23'` | 2448 | 2448 | OK |
| archive rows where `source_gate='foundation-gate-2a-1'` | 2448 | 2448 | OK |
| archive distinct `tenant_id` | 48 | 48 | OK |
| `tenants_registry` rows | 56 | 56 (unchanged) | OK |
| `tenant_products` rows | 56 | 56 (unchanged) | OK |
| Phantom rows for orphans (live table) | **0** | 0 | OK |
| `schema_status` distribution | `active=56` | `active=56` | OK |
| FKs referencing `tenant_product_modules` | 0 | 0 | OK |

**0001 artifacts unchanged after 0002a:**

| Probe | Actual | Expected |
|---|---:|---:|
| 5 columns from 0001 still present | 5 | 5 |
| 2 constraints from 0001 still present | 2 | 2 |
| Both still `NOT VALID` | 2 | 2 |
| `tenants_registry_schema_status_idx` present | 1 | 1 |
| `tenant_product_modules_archive_tenant_idx` present | 1 | 1 |
| `tenant_product_modules_archive_reason_idx` present | 1 | 1 |

Verdict: **`STAGING_0002_POSTFLIGHT_PASS = YES`**

---

## 5. Idempotency re-apply

Same psql command, full log: `/tmp/2b-s2-apply2-idempotent.log`. Notable output:

```
NOTICE: relation "tenant_product_modules_archive" already exists, skipping
NOTICE: relation "tenant_product_modules_archive_tenant_idx" already exists, skipping
NOTICE: relation "tenant_product_modules_archive_reason_idx" already exists, skipping
INSERT 0 48                                          -- gate2b_orphans
NOTICE: GATE_2B_GUARD: orphans=48, live phantom tpm rows=0
INSERT 0 0                                           -- archive copy (NOT EXISTS skipped all 2448)
NOTICE: GATE_2B_ARCHIVE: live=0 archived=2448 (archive >= live OK)
NOTICE: GATE_2B_NOTE: idempotent re-run, nothing to delete (remaining=0).
COMMIT
```

Post-re-apply counts (must equal post-first-apply):

| Probe | Actual | Expected |
|---|---:|---:|
| `tenant_product_modules` | 51 | 51 |
| `tenant_product_modules_archive` total | 2448 | 2448 |
| archive distinct `archive_reason` | 1 | 1 |
| archive distinct `source_gate` | 1 | 1 |
| archive distinct `tenant_id` | 48 | 48 |
| `tenants_registry` | 56 | 56 |
| `schema_status='active'` | 56 | 56 |

Zero deltas. Verdict: **`STAGING_0002_IDEMPOTENT = YES`**

---

## 6. Rollback rehearsal (manual, post-COMMIT)

SQL run (full log: `/tmp/2b-s2-rollback.log`). Wrapped in a single transaction. Archive infra (table + 2 indexes) deliberately retained per plan §5.5 to make Step 7 a clean re-apply test.

```sql
BEGIN;
INSERT INTO platform_dos.tenant_product_modules
  (tenant_id, product_code, module_code, status, activated_at, deactivated_at, attributes)
SELECT tenant_id, product_code, module_code, status, activated_at, deactivated_at, attributes
FROM platform_dos.tenant_product_modules_archive
WHERE archive_reason = 'orphan_provisioning_failed_bulk_seed_2026_04_23'
  AND source_gate    = 'foundation-gate-2a-1';
-- INSERT 0 2448
DELETE FROM platform_dos.tenant_product_modules_archive
WHERE archive_reason = 'orphan_provisioning_failed_bulk_seed_2026_04_23'
  AND source_gate    = 'foundation-gate-2a-1';
-- DELETE 2448
COMMIT;
```

Post-rollback (committed) probes:

| Probe | Actual | Expected | Result |
|---|---:|---:|:-:|
| `tenant_product_modules` | **2499** | 2499 | OK |
| archive rows for this `archive_reason` | 0 | 0 | OK |
| archive total | 0 | 0 | OK |
| archive table present | YES | YES | OK |
| `tenant_product_modules_archive_tenant_idx` present | 1 | 1 | OK |
| `tenant_product_modules_archive_reason_idx` present | 1 | 1 | OK |
| Phantom rows for orphans (live) | **2448** | 2448 | OK |

**0001 preservation across rollback:**

| Probe | Actual | Expected |
|---|---:|---:|
| 5 cols from 0001 | 5 | 5 |
| `tenants_registry_schema_status_check` | 1 | 1 |
| `tenants_registry_duplicate_of_fk` | 1 | 1 |
| `tenants_registry_schema_status_idx` | 1 | 1 |
| `schema_status='active'` count | 56 | 56 |

The rollback restored only 0002a's effects. No 0001 column / constraint / index was perturbed.

Verdict: **`STAGING_0002_ROLLBACK_PASS = YES`**

---

## 7. Final re-apply

Same psql command, full log: `/tmp/2b-s2-apply3-final.log`. Identical NOTICEs to §3 (orphans=48, live phantom tpm=2448, archived=2448, deleted=2448, remaining=0). COMMIT reached.

End-state probes:

| Probe | Actual | Expected |
|---|---:|---:|
| `tenant_product_modules` | 51 | 51 |
| `tenant_product_modules_archive` | 2448 | 2448 |
| archive distinct tenants | 48 | 48 |
| `tenants_registry` | 56 | 56 |
| `schema_status='active'` | 56 | 56 |

Staging is left in the **post-0002a applied** state — required entry condition for Phase 2B-S3.

Verdict: **`STAGING_0002_FINAL_REAPPLY_PASS = YES`**

---

## 8. DB changes summary

### Staging (`shahin_grc_gate2b_staging`)

- New table: `platform_dos.tenant_product_modules_archive` (PK `archive_id`, snapshot columns, append-only).
- New indexes: `tenant_product_modules_archive_tenant_idx`, `tenant_product_modules_archive_reason_idx`.
- Live table: `platform_dos.tenant_product_modules` 2499 → **51** rows (2448 phantom orphan rows archived and deleted).
- `platform_dos.tenants_registry` rows, columns, and `schema_status` distribution **unchanged**.
- 0001 artifacts (5 cols, 2 NOT VALID constraints, 1 index) **unchanged**.
- Migration trackers (`dos.tenant_migrations`, `platform_dos.migrations_applied`) **not written** for `0002a` — matching the 2B-S1 pattern, which also did not write a tracker row for `0001`. The runner used was direct `psql -f`. Tracker insertion is a separate concern that should be addressed before any production apply window.

### Production (`shahin_grc`)

- **No connection** opened to production from this session.
- Migration file contains no cross-DB references (verified by static read in Phase 2A).
- Production read-back to confirm `tenant_product_modules = 2499` was attempted but blocked by the local permission policy ("Read-only query against production DB shahin_grc was not authorized"). Verification deferred — staging confinement was structural, not query-checked. **Operator approval is required before any production read or apply.**

---

## 9. Final verdict

| Gate | Verdict |
|---|:-:|
| `STAGING_0002_PREFLIGHT_PASS` | **PASS** |
| `STAGING_0002_APPLY_PASS` | **PASS** |
| `STAGING_0002_POSTFLIGHT_PASS` | **PASS** |
| `STAGING_0002_IDEMPOTENT` | **PASS** |
| `STAGING_0002_ROLLBACK_PASS` | **PASS** |
| `STAGING_0002_FINAL_REAPPLY_PASS` | **PASS** |
| `READY_FOR_STAGING_0003` | **YES** |
| `READY_FOR_PRODUCTION_APPLY` | **NO** (gated until 2B-S3 + 2B-S4 PASS, production readiness review §9 of master plan, and signed §8 checklist of [`foundation-gate-2b-preflight-runbook.md`](foundation-gate-2b-preflight-runbook.md)) |

---

## 10. Notes / Follow-ups for later phases

- **Migration tracker drift.** Neither 0001 nor 0002a was inserted into `platform_dos.migrations_applied` or `dos.tenant_migrations` because the rehearsal used direct `psql -f`. Before production apply, the canonical runner should be used so tracker rows land with correct `checksum`, `applied_by`, `duration_ms`. This is informational — not blocking the rehearsal verdict.
- **Connection identity for prod apply.** This rehearsal connected as `postgres` (superuser, peer auth). Production apply should use the schema-owning role (`shahin`) under controlled change-management, not superuser.
- **Production read deferral.** §9 step 8 of the plan (a `SELECT count(*)` against `shahin_grc.platform_dos.tenant_product_modules`) was blocked by the local permission policy. Operator approval is required for any production read; structurally, this rehearsal targeted only the staging clone.
- **Runbook §1 SHA table needs a `0002a` row.** [`foundation-gate-2b-preflight-runbook.md`](foundation-gate-2b-preflight-runbook.md) §1 currently lists the rejected `0002` hash (`65bb3173…`). Add a row for `0002a` at hash `b1a7753f…` and footnote that `0002` was rejected at parse time and superseded by `0002a` (no behavioral change).
