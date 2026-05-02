# Foundation DB Gate 2B — Draft Migration Review

**Mode:** DRAFT ONLY. None of the four migration files in this review have been applied. No DB changes have been made.
**Source gate report:** [`DOS-AIO-Specs/audit/modules/_phase1-foundation-gate-2a-1.md`](../../DOS-AIO-Specs/audit/modules/_phase1-foundation-gate-2a-1.md) (and predecessor `_phase1-foundation-gate-2a.md`).
**Companion contract:** [`platform/docs/foundation/foundation-db-reconciliation-phase1a.md`](../../platform/docs/foundation/foundation-db-reconciliation-phase1a.md).

This document is the human-review gate that must be approved before any of the four migration drafts may be executed.

---

## 1. Drafts in this batch

| Order | File | Purpose |
|------:|------|---------|
| 1 | `ops/migrations/20260430_0001_foundation_tenant_schema_status.sql` | Additive `schema_status*` columns + soft CHECK constraint on `platform_dos.tenants_registry`. |
| 2 | `ops/migrations/20260430_0002_archive_phantom_tenant_product_modules.sql` | Archive-then-delete the **2448** phantom `tenant_product_modules` rows attached to the 48 orphan registry tenants. |
| 3 | `ops/migrations/20260430_0003_foundation_mark_orphan_registry_rows.sql` | Set `schema_status='orphan_provisioning_failed'` on 45 hex stubs and `'test_stub'` on the 3 named stubs (`rimtest1776461709`, `tenta`, `tentb`). |
| 4 | `ops/migrations/20260430_0004_foundation_backfill_dangling_schemas.sql` | Insert registry rows for **4** of the 5 dangling schemas: `a7f7b3f6f0df`, `douhan_consult`, `f2a45bc25f31`, `validate_migrations`. |

The drafts are designed to be applied **in this exact order**. Skipping or reordering will be detected and aborted by the in-script invariant guards.

---

## 2. Exactly what would change

### 2.1 Migration 0001 — schema_status column

- `platform_dos.tenants_registry` gains 5 columns: `schema_status text DEFAULT 'active'`, `schema_status_reason text`, `schema_checked_at timestamptz`, `duplicate_of_tenant_id text`, `archived_at timestamptz`.
- `tenants_registry_schema_status_check` CHECK constraint is added **NOT VALID** (does not scan or reject existing rows).
- `tenants_registry_duplicate_of_fk` self-FK on `duplicate_of_tenant_id` is added **NOT VALID**.
- `tenants_registry_schema_status_idx` btree index on `(schema_status)`.

**Expected affected row counts:** 0 rows updated (additive only). 56 rows acquire `schema_status='active'` via column DEFAULT.

### 2.2 Migration 0002 — phantom TPM archive + delete

- Creates `platform_dos.tenant_product_modules_archive` if missing.
- Copies 2448 rows into the archive with `archive_reason='orphan_provisioning_failed_bulk_seed_2026_04_23'` and `source_gate='foundation-gate-2a-1'`.
- Deletes those exact 2448 rows from `platform_dos.tenant_product_modules`.
- **Hard aborts** if orphan count drifts from 48, phantom row count drifts from 2448, or post-delete residual ≠ 0.

**Expected affected row counts:** archive +2448, live −2448. Net `tenant_product_modules` after migration: **2499 → 51** (only `dogan` retains entitlement rows).

### 2.3 Migration 0003 — mark orphan rows

- 45 hex tenants → `schema_status='orphan_provisioning_failed'`, `schema_status_reason='bulk_seed_without_schema_2026_04_23'`.
- 3 named test stubs → `schema_status='test_stub'`, `schema_status_reason='named_test_stub_no_schema'`.
- No rows deleted from `tenants_registry` or `tenant_products`.
- Hard aborts if any allow-listed tenant has acquired a physical schema since Gate 2A.

**Expected affected row counts:** 48 UPDATEs.

### 2.4 Migration 0004 — backfill 4 dangling schemas

- Inserts 4 rows into `platform_dos.tenants_registry` (`ON CONFLICT DO NOTHING`).
- Each carries the agreed `schema_status` per Gate 2A.1 §6.

**Expected affected row counts:** 4 INSERTs.

---

## 3. Excluded scope (intentionally NOT touched)

| Subject | Reason |
|---------|--------|
| `tenant_51f36271df62ea3d` | `dos.tenants` row says `Info Dogan Consult workspace` — possible real customer. **Manual owner review required** before any registry write. |
| `2c71cc2d-…` and `2ba4b532-…` (Dpgan canonical decision) | Both schemas are byte-equivalent and devoid of business data (Gate 2A.1 §1). Decision is *organizational* — owner must pick which `tenant_id` belongs to the real Dogan Consult customer. Until then, neither row is touched. |
| 27 onboarding-spam `dos.tenants` rows | Origin is `services/onboarding-service` — writes `dos.tenants` BEFORE the registry/schema-create step. Cleanup belongs to onboarding-service team, **not Foundation**. |
| 28 `dos.users` and 26 `dos.tenant_memberships` rows linked to spam | Same reason — onboarding-service ownership. Touching these would orphan live FKs across non-Foundation tables. |
| `public.login_attempts` (1343 rows) | Lives in `public` despite canonical owner being `platform_dauth.login_attempts`. Cutover is its own gate; out of Phase 2B. |
| `users`, `tenants`, `invitations`, `sod_rules`, `feature_flags` | Contested tables (Phase 1A `contestedTables`). Each requires its own owner-resolution gate before any reconciliation. |
| RLS on Foundation tables | Cannot enable until gateway/service-bootstrap wires `SET LOCAL app.tenant_id = $1` from request context. Enabling now would hard-fail queries (Gate 1 §4). |
| `_legacy` table drops, schema renames | Forbidden in Phase 2B per gate scope. |

---

## 4. Pre-flight SQL (run BEFORE any migration is applied)

```sql
-- 4.1 Confirm gate counts have not drifted since Gate 2A.1.
SELECT 'tenants_registry'              AS source, count(*) FROM platform_dos.tenants_registry
UNION ALL
SELECT 'tenant_product_modules',                count(*) FROM platform_dos.tenant_product_modules
UNION ALL
SELECT 'physical tenant_* schemas',             count(*) FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%';
-- Expect: 56, 2499, 13.

-- 4.2 Confirm orphan/phantom invariants.
WITH schemas AS (
  SELECT lower(regexp_replace(schema_name,'^tenant_','')) AS norm
  FROM information_schema.schemata WHERE schema_name LIKE 'tenant\_%'
),
orphans AS (
  SELECT r.tenant_id
  FROM platform_dos.tenants_registry r
  WHERE NOT EXISTS (
    SELECT 1 FROM schemas s
    WHERE s.norm = lower(regexp_replace(r.tenant_id,'-','','g'))
  )
)
SELECT
  (SELECT count(*) FROM orphans)                                                AS orphan_count_expect_48,
  (SELECT count(*) FROM platform_dos.tenant_product_modules t
     WHERE t.tenant_id IN (SELECT tenant_id FROM orphans))                      AS phantom_tpm_expect_2448;

-- 4.3 Confirm schema_status column does NOT yet exist.
SELECT count(*) AS schema_status_present_expect_0
FROM information_schema.columns
WHERE table_schema='platform_dos' AND table_name='tenants_registry' AND column_name='schema_status';

-- 4.4 Confirm the 4 backfill schemas exist and the 5th excluded schema also exists.
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN (
  'tenant_a7f7b3f6f0df','tenant_douhan_consult','tenant_f2a45bc25f31',
  'tenant_validate_migrations','tenant_51f36271df62ea3d'
)
ORDER BY schema_name;
-- Expect 5 rows.
```

---

## 5. Post-flight SQL (run AFTER each migration)

### After 0001
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema='platform_dos' AND table_name='tenants_registry'
  AND column_name IN ('schema_status','schema_status_reason','schema_checked_at',
                      'duplicate_of_tenant_id','archived_at')
ORDER BY column_name;
SELECT schema_status, count(*) FROM platform_dos.tenants_registry GROUP BY 1 ORDER BY 1;
-- Expect: 5 rows; one group 'active' = 56.
```

### After 0002
```sql
SELECT count(*) AS live_tpm_expect_51   FROM platform_dos.tenant_product_modules;
SELECT count(*) AS archive_tpm_expect_2448 FROM platform_dos.tenant_product_modules_archive
  WHERE archive_reason='orphan_provisioning_failed_bulk_seed_2026_04_23';
```

### After 0003
```sql
SELECT schema_status, count(*) FROM platform_dos.tenants_registry
GROUP BY 1 ORDER BY 1;
-- Expect: active=8, orphan_provisioning_failed=45, test_stub=3.
```

### After 0004
```sql
SELECT tenant_id, schema_status, schema_status_reason
FROM platform_dos.tenants_registry
WHERE tenant_id IN ('a7f7b3f6f0df','douhan_consult','f2a45bc25f31','validate_migrations')
ORDER BY tenant_id;
-- Expect 4 rows with the agreed statuses.
SELECT count(*) AS registry_total_expect_60 FROM platform_dos.tenants_registry;
```

---

## 6. Rollback plan

| File | Rollback strategy |
|------|-------------------|
| 0001 | `ALTER TABLE platform_dos.tenants_registry DROP COLUMN ...` for each added column. Drops are safe: no other table references them. The `_archive` table from 0002 references no column from 0001. |
| 0002 | Re-`INSERT` from `platform_dos.tenant_product_modules_archive` filtered by `archive_reason='orphan_provisioning_failed_bulk_seed_2026_04_23'`, then DELETE from the archive. Full SQL is included as a comment in the migration footer. |
| 0003 | Single `UPDATE` setting the 48 rows back to `schema_status='active'`, `schema_status_reason=NULL`, `schema_checked_at=NULL`. |
| 0004 | `DELETE FROM platform_dos.tenants_registry WHERE tenant_id IN (...) AND attributes->>'backfill_source'='gate-2b'`. |

---

## 7. Why the Dpgan canonical decision is excluded

Both `2c71cc2d-6728-4394-b2c4-02ac087bba82` and `2ba4b532-3361-413c-ac6c-9c992f66bec4` carry display name `Dpgan Consult` (typo of *Dogan*) and have physical schemas. Gate 2A.1 §1 proved both schemas are functionally empty (no `users`, no `organizations`, no `audit_trail`, no `workflow_instances`, no `evidence_items`; only `event_outbox` write-amplification). Picking which row is canonical is therefore an **organizational decision** about which `tenant_id` should be handed to the real Dogan Consult customer, not a data-migration decision. Phase 2B will not pre-empt that decision; the chosen winner can later be marked `schema_status='active'` and the loser `schema_status='active_duplicate'` with `duplicate_of_tenant_id=<winner>` using the column added by 0001.

## 8. Why the onboarding-service spam is excluded

`dos.tenants` carries 27 rows with no registry and no schema. The naming pattern (`<full_name> workspace`) and creation-time clustering match `services/onboarding-service` writes. Cleanup requires:
1. Onboarding-service owner to confirm whether any of these workspaces should be promoted vs. archived.
2. A coordinated delete of the linked 28 `dos.users` and 26 `dos.tenant_memberships` rows.
3. Reordering the onboarding-service write path so `dos.tenants` is **not** written until `tenants_registry` + schema-create succeed.

None of this belongs to the Foundation reconciliation gate.

---

## 9. Approval status

- [ ] Foundation owner sign-off
- [ ] DBA sign-off
- [ ] Pre-flight SQL output attached and matches expected counts
- [ ] Approved order-of-application: 0001 → 0002 → 0003 → 0004
- [ ] Post-flight SQL committed to the rollout runbook

Until every box is checked, the four files in `ops/migrations/2026043*` remain DRAFT and **must not be executed**.
