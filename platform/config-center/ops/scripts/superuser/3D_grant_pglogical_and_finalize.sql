-- Step 3D — Grant pglogical USAGE to dos_auth + finalize the 2 misclassified
-- migration ledger entries for tenant_f2a45bc25f31.
-- Run as postgres superuser.

\set ON_ERROR_STOP on
BEGIN;

-- 1) pglogical replication extension uses its own schema; tenant DDL on a
--    table tracked by pglogical triggers privilege checks against
--    pglogical.* catalog tables. Grant the minimum needed (USAGE).
GRANT USAGE ON SCHEMA pglogical TO dos_auth;
GRANT SELECT ON ALL TABLES IN SCHEMA pglogical TO dos_auth;

-- 2) Reclassify the workflow/022 row: it mutates dos.workflow_instances
--    (a public dos.* table) and was misfiled as a tenant migration. The
--    columns it adds already exist in dos.workflow_instances (verified).
--    Mark as superseded so reconciler stops retrying.
UPDATE dos.tenant_migrations
   SET status='superseded-misclassified',
       error_message='Migration mutates dos.workflow_instances (platform scope), not tenant_*. '
                  || 'All 5 added columns verified present in dos.workflow_instances on 2026-04-30. '
                  || 'Reclassified during fix-1374-failures sweep.',
       applied_by='fix-1374-sweep',
       applied_at=NOW()
 WHERE tenant_id='f2a45bc25f31'
   AND migration_id='module/workflow/022_reconcile_workflow_tables'
   AND status='failed';

COMMIT;
