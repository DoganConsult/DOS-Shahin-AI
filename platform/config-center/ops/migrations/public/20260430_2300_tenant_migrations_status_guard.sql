-- ════════════════════════════════════════════════════════════════════════
-- Fix 5 (Phase 18) — Reject the verified-by-clone ledger lie at the DB
-- level. The platform runner and provision-tenant-from-template script no
-- longer emit this status; this CHECK locks the door so a future regression
-- cannot reintroduce the phantom "applied without DDL" state.
--
-- Existing verified-by-clone rows are rewritten to 'applied' and tagged in
-- applied_by so provenance is preserved.
--
-- Idempotent. Forward-only. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════
BEGIN;

DO $$
DECLARE
  n INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='dos' AND table_name='tenant_migrations') THEN
    RAISE NOTICE 'dos.tenant_migrations not present, skipping';
    RETURN;
  END IF;

  -- 1. Backfill existing verified-by-clone rows → applied (with provenance).
  UPDATE dos.tenant_migrations
     SET status     = 'applied',
         applied_by = COALESCE(applied_by, '') || ':rewritten-from=verified-by-clone'
   WHERE status = 'verified-by-clone';
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'rewrote % verified-by-clone rows to applied', n;

  -- 2. Drop any prior incarnation of the constraint (re-runnable).
  ALTER TABLE dos.tenant_migrations DROP CONSTRAINT IF EXISTS chk_tenant_migrations_status_v2;

  -- 3. Add CHECK that bans verified-by-clone going forward.
  ALTER TABLE dos.tenant_migrations
    ADD CONSTRAINT chk_tenant_migrations_status_v2
    CHECK (status IN ('applied','failed','verified-by-backfill','superseded-misclassified'));
END$$;

COMMIT;
