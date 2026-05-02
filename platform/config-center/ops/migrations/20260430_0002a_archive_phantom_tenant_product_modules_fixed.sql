-- ============================================================================
-- Foundation Reconciliation Phase 2B-S2-FIX
-- File: 20260430_0002a_archive_phantom_tenant_product_modules_fixed.sql
--
-- This file is the FULL REPLACEMENT for the rejected
--   ops/migrations/_rejected/
--     20260430_0002_archive_phantom_tenant_product_modules.sql.rejected
--
-- The rejected 0002 failed at parse time on staging because step 5 embedded
-- `RAISE NOTICE` inside a SQL scalar expression
--   (SELECT (RAISE NOTICE 'unreachable')::text)
-- which is invalid (RAISE is a PL/pgSQL statement, not an SQL expression).
-- The script opened BEGIN but never reached COMMIT, so zero objects/rows
-- were committed on shahin_grc_gate2b_staging. Production was never touched.
--
-- INTENT (unchanged from rejected 0002 — no widening of scope)
--   Archive-then-delete the 2448 phantom rows in
--   platform_dos.tenant_product_modules that belong to the 48 orphan
--   registry tenants identified in Gate 2A (45 hex stubs + 3 named
--   stubs: rimtest1776461709, tenta, tentb).
--
-- SAFETY CONTRACT (unchanged from rejected 0002)
--   - No FK references TO tenant_product_modules exist (verified in
--     Gate 2A.1 §2.3 — pg_constraint scan returned 0).
--   - Wrapped in a single transaction.
--   - Hard-aborts (RAISE EXCEPTION) unless guards hold:
--       (i)  orphan tenant count == 48
--       (ii) phantom tpm row count == 2448
--       (iii) archive coverage >= live phantom count before DELETE
--       (iv) post-DELETE phantom row count == 0
--       (v)  rows deleted by step 5 is either 0 (idempotent re-run) or 2448
--   - Idempotent: a second run finds 0 rows in the source and copies 0
--     rows into the archive (because rows are already archived). Re-runs
--     are no-ops.
--   - Operates only on tenants that satisfy ALL of:
--       (a) registered as orphan in Gate 2A,
--       (b) registry row exists,
--       (c) NO physical tenant_<norm> schema exists,
--       (d) tenant_product_modules row count for the tenant = 51,
--       (e) product_code = 'shahin'.
--   - Refuses to run if Gate 2A.1 §2.1 invariants drift.
--
-- DIFF VS REJECTED 0002
--   - Step 5 of rejected 0002 used a `WITH del AS (DELETE …) SELECT CASE …
--     ELSE (SELECT (RAISE NOTICE 'unreachable')::text) END … \gset` block.
--     That construct is invalid SQL.
--   - Step 5 here is a `WITH del AS (DELETE …) SELECT count(*) …` that
--     captures the deleted-row count into a temp table, immediately
--     followed by a DO-block that:
--       * RAISE NOTICE on the count (PL/pgSQL statement form),
--       * RAISE EXCEPTION if the count is neither 0 nor 2448,
--       * RAISE EXCEPTION if any orphan tpm rows remain.
--     The behavioural envelope (commit only when phantoms are 0 and
--     deleted-count ∈ {0, 2448}) is identical to rejected 0002's intent.
--   - No other logic, table, or invariant was added, removed, or relaxed.
-- ============================================================================

BEGIN;

-- 0. Archive table -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_dos.tenant_product_modules_archive (
  archive_id          bigserial PRIMARY KEY,
  archived_at         timestamptz   NOT NULL DEFAULT now(),
  archive_reason      text          NOT NULL,
  source_gate         text          NOT NULL,
  -- mirror of the source columns (snapshot, not FK-bound)
  tenant_id           text          NOT NULL,
  product_code        text          NOT NULL,
  module_code         text          NOT NULL,
  status              text          NULL,
  activated_at        timestamptz   NULL,
  deactivated_at      timestamptz   NULL,
  attributes          jsonb         NULL
);

COMMENT ON TABLE platform_dos.tenant_product_modules_archive IS
  'Append-only archive for reconciliation deletes from
   platform_dos.tenant_product_modules. Rows in this table are evidence,
   not live data — readers must NOT join through this for entitlement
   decisions. Source contract: foundation-gate-2b-review.md.';

CREATE INDEX IF NOT EXISTS tenant_product_modules_archive_tenant_idx
  ON platform_dos.tenant_product_modules_archive (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_product_modules_archive_reason_idx
  ON platform_dos.tenant_product_modules_archive (archive_reason);

-- 1. Resolve the 48 orphan tenant_ids dynamically ----------------------------
DROP TABLE IF EXISTS pg_temp.gate2b_orphans;
CREATE TEMP TABLE gate2b_orphans (tenant_id text PRIMARY KEY) ON COMMIT DROP;

WITH schemas AS (
  SELECT lower(regexp_replace(schema_name,'^tenant_','')) AS norm
  FROM information_schema.schemata
  WHERE schema_name LIKE 'tenant\_%'
)
INSERT INTO gate2b_orphans (tenant_id)
SELECT r.tenant_id
FROM platform_dos.tenants_registry r
WHERE NOT EXISTS (
  SELECT 1 FROM schemas s
  WHERE s.norm = lower(regexp_replace(r.tenant_id,'-','','g'))
);

-- 2. Invariant guard (Gate 2A.1 §2.1) ---------------------------------------
DO $$
DECLARE
  v_orphans  int;
  v_phantoms int;
BEGIN
  SELECT count(*) INTO v_orphans FROM gate2b_orphans;
  IF v_orphans <> 48 THEN
    RAISE EXCEPTION
      'GATE_2B_ABORT: orphan tenant count drifted (expected 48, got %). '
      'Re-run Gate 2A.1 before applying this migration.', v_orphans;
  END IF;

  SELECT count(*) INTO v_phantoms
  FROM platform_dos.tenant_product_modules tpm
  JOIN gate2b_orphans o USING (tenant_id);

  -- On an idempotent re-run, v_phantoms is allowed to be 0 (already deleted)
  -- because the archive copy from a prior successful run already exists.
  IF v_phantoms NOT IN (0, 2448) THEN
    RAISE EXCEPTION
      'GATE_2B_ABORT: phantom tpm row count drifted (expected 0 or 2448, got %). '
      'Re-run Gate 2A.1 before applying this migration.', v_phantoms;
  END IF;

  RAISE NOTICE
    'GATE_2B_GUARD: orphans=%, live phantom tpm rows=%', v_orphans, v_phantoms;
END$$;

-- 3. Archive copy (skip rows already archived by an earlier run) -------------
WITH to_copy AS (
  SELECT tpm.*
  FROM platform_dos.tenant_product_modules tpm
  JOIN gate2b_orphans o USING (tenant_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM platform_dos.tenant_product_modules_archive a
    WHERE a.tenant_id    = tpm.tenant_id
      AND a.product_code = tpm.product_code
      AND a.module_code  = tpm.module_code
      AND a.archive_reason = 'orphan_provisioning_failed_bulk_seed_2026_04_23'
  )
)
INSERT INTO platform_dos.tenant_product_modules_archive
  (archive_reason, source_gate, tenant_id, product_code, module_code,
   status, activated_at, deactivated_at, attributes)
SELECT
  'orphan_provisioning_failed_bulk_seed_2026_04_23',
  'foundation-gate-2a-1',
  tenant_id, product_code, module_code,
  status, activated_at, deactivated_at, attributes
FROM to_copy;

-- 4. Confirm the live phantom set is fully archived --------------------------
DO $$
DECLARE
  v_live  int;
  v_arch  int;
BEGIN
  SELECT count(*) INTO v_live
  FROM platform_dos.tenant_product_modules tpm
  JOIN gate2b_orphans o USING (tenant_id);

  SELECT count(*) INTO v_arch
  FROM platform_dos.tenant_product_modules_archive a
  JOIN gate2b_orphans o USING (tenant_id)
  WHERE a.archive_reason = 'orphan_provisioning_failed_bulk_seed_2026_04_23';

  IF v_arch < v_live THEN
    RAISE EXCEPTION
      'GATE_2B_ABORT: archive coverage incomplete (live=% archived=%). '
      'Refusing to delete.', v_live, v_arch;
  END IF;

  RAISE NOTICE
    'GATE_2B_ARCHIVE: live=% archived=% (archive >= live OK)', v_live, v_arch;
END$$;

-- 5. Delete with exact-count guard (FIXED — no RAISE-in-SELECT) -------------
CREATE TEMP TABLE gate2b_delete_count (deleted int NOT NULL) ON COMMIT DROP;

WITH del AS (
  DELETE FROM platform_dos.tenant_product_modules tpm
  USING gate2b_orphans o
  WHERE tpm.tenant_id = o.tenant_id
  RETURNING 1
)
INSERT INTO gate2b_delete_count (deleted)
SELECT count(*) FROM del;

-- 6. Verdict + post-DELETE invariant (PL/pgSQL only) ------------------------
DO $$
DECLARE
  v_deleted   int;
  v_remaining int;
BEGIN
  SELECT deleted INTO v_deleted FROM gate2b_delete_count;

  SELECT count(*) INTO v_remaining
  FROM platform_dos.tenant_product_modules tpm
  JOIN gate2b_orphans o USING (tenant_id);

  IF v_deleted = 0 THEN
    RAISE NOTICE
      'GATE_2B_NOTE: idempotent re-run, nothing to delete (remaining=%).',
      v_remaining;
  ELSIF v_deleted = 2448 THEN
    RAISE NOTICE
      'GATE_2B_OK: deleted 2448 phantom rows (remaining=%).', v_remaining;
  ELSE
    RAISE EXCEPTION
      'GATE_2B_ABORT: unexpected delete count % (expected 0 or 2448). '
      'Transaction rolled back.', v_deleted;
  END IF;

  IF v_remaining <> 0 THEN
    RAISE EXCEPTION
      'GATE_2B_ABORT: % phantom rows remain after DELETE. '
      'Transaction rolled back.', v_remaining;
  END IF;
END$$;

COMMIT;

-- ----------------------------------------------------------------------------
-- ROLLBACK (manual, if executed up to but not past COMMIT):
--   ROLLBACK;
--
-- ROLLBACK (if already committed) — restores the 2448 phantom rows from the
-- archive and removes the archive copy. This rollback ONLY undoes 0002a's
-- effects; it MUST NOT touch 0001 columns/constraints/index:
--
--   BEGIN;
--   INSERT INTO platform_dos.tenant_product_modules
--     (tenant_id, product_code, module_code, status, activated_at,
--      deactivated_at, attributes)
--   SELECT tenant_id, product_code, module_code, status, activated_at,
--          deactivated_at, attributes
--   FROM platform_dos.tenant_product_modules_archive
--   WHERE archive_reason = 'orphan_provisioning_failed_bulk_seed_2026_04_23'
--     AND source_gate    = 'foundation-gate-2a-1';
--
--   DELETE FROM platform_dos.tenant_product_modules_archive
--   WHERE archive_reason = 'orphan_provisioning_failed_bulk_seed_2026_04_23'
--     AND source_gate    = 'foundation-gate-2a-1';
--
--   -- Optional: drop the archive infra if it was created by this migration
--   --           and no other reconciliation has populated it.
--   --   DROP INDEX IF EXISTS platform_dos.tenant_product_modules_archive_reason_idx;
--   --   DROP INDEX IF EXISTS platform_dos.tenant_product_modules_archive_tenant_idx;
--   --   DROP TABLE IF EXISTS platform_dos.tenant_product_modules_archive;
--   COMMIT;
-- ----------------------------------------------------------------------------
