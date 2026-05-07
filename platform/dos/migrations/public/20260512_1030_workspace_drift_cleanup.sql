-- =====================================================================
-- 20260512_1030_workspace_drift_cleanup.sql
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / Dynamic UI-OS only.
--
-- 5 deactivated/test tenants still carry workspace_shell_binding +
-- ui_workspace_chrome rows from prior seeds. The resolver gates on
-- dos.tenants.status='active', but leaving disabled rows behind is drift
-- the doctrine forbids ("if data is required, store it; if not, remove it").
--
-- Disables (does not destroy) the binding/chrome/shortcut/banner/policy
-- rows for non-active tenants. Idempotent.
-- =====================================================================

BEGIN;

WITH inactive_tenants AS (
  SELECT DISTINCT b.tenant_id
    FROM dos.workspace_shell_binding b
   WHERE b.tenant_id NOT IN (SELECT tenant_id FROM dos.tenants WHERE status='active')
)
UPDATE dos.workspace_shell_binding b
   SET enabled    = false,
       version    = version + 1,
       updated_at = now()
  FROM inactive_tenants it
 WHERE b.tenant_id = it.tenant_id
   AND b.enabled = true;

WITH inactive_tenants AS (
  SELECT DISTINCT c.tenant_id
    FROM dos.ui_workspace_chrome c
   WHERE c.tenant_id NOT IN (SELECT tenant_id FROM dos.tenants WHERE status='active')
)
UPDATE dos.ui_workspace_chrome c
   SET enabled    = false,
       updated_at = now()
  FROM inactive_tenants it
 WHERE c.tenant_id = it.tenant_id
   AND c.enabled = true;

UPDATE dos.ui_workspace_shortcut
   SET enabled = false
 WHERE enabled = true
   AND tenant_id NOT IN (SELECT tenant_id FROM dos.tenants WHERE status='active');

UPDATE dos.ui_workspace_banner
   SET enabled = false
 WHERE enabled = true
   AND tenant_id NOT IN (SELECT tenant_id FROM dos.tenants WHERE status='active');

UPDATE dos.ui_workspace_policy
   SET enabled = false
 WHERE enabled = true
   AND tenant_id NOT IN (SELECT tenant_id FROM dos.tenants WHERE status='active');

-- Self-test
DO $$
DECLARE drift int;
BEGIN
  SELECT count(*) INTO drift
    FROM (
      SELECT DISTINCT tenant_id FROM dos.workspace_shell_binding WHERE enabled=true
      EXCEPT
      SELECT tenant_id FROM dos.tenants WHERE status='active'
    ) x;
  IF drift > 0 THEN
    RAISE EXCEPTION 'workspace-drift-cleanup: % drift tenants still have enabled bindings', drift;
  END IF;
  RAISE NOTICE 'workspace-drift-cleanup: zero drift';
END$$;

COMMIT;
