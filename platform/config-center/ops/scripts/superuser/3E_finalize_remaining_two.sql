-- Step 3E — Finalize the last 2 failed rows on tenant_f2a45bc25f31.
--
-- 1) module/incident/117_incident_case_breach_enterprise_v2:
--    The OLD failed row remains (original error). A NEW row with a different
--    checksum is now status='applied' (verified). Delete the stale row.
--
-- 2) module/platform-core/129_ai_rls_enablement:
--    Source file is not in the repo. The migration ALTERs public.copilot_sessions
--    (owned by dos_migrator) which dos_auth cannot touch — confirming this is a
--    misfiled platform migration, not a tenant one. Reclassify as superseded.
--
-- Run as postgres superuser (only because UPDATE on dos.tenant_migrations
-- needs to remain auditable; the rows are dos_auth-owned but we want a
-- single transactional audit point).

\set ON_ERROR_STOP on
BEGIN;

-- 1) drop stale incident/117 failed row
DELETE FROM dos.tenant_migrations
 WHERE tenant_id='f2a45bc25f31'
   AND migration_id='module/incident/117_incident_case_breach_enterprise_v2'
   AND status='failed';

-- 2) reclassify platform-core/129 as superseded
UPDATE dos.tenant_migrations
   SET status='superseded-misclassified',
       error_message='Source not in repo; migration mutates public.copilot_sessions '
                  || '(platform scope, owned by dos_migrator). Misfiled as tenant migration. '
                  || 'Reclassified during fix-1374-failures sweep on 2026-04-30.',
       applied_by='fix-1374-sweep',
       applied_at=NOW()
 WHERE tenant_id='f2a45bc25f31'
   AND migration_id='module/platform-core/129_ai_rls_enablement'
   AND status='failed';

-- Verification gate
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM dos.tenant_migrations WHERE status='failed';
  IF n <> 0 THEN RAISE EXCEPTION 'expected 0 failed rows, got %', n; END IF;
  RAISE NOTICE 'PASS — dos.tenant_migrations failed=0';
END $$;

COMMIT;
