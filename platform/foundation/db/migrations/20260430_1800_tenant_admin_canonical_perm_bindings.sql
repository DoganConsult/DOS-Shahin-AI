-- ════════════════════════════════════════════════════════════════════════
-- 20260430_1800 — Phase 18.1 — Bind tenant_admin to canonical foundation perms
--
-- Companion to the founder-elevation hook (post-login-roles.ts FOUNDER_ROLE).
-- The reconcile migration (20260430_1700) bound tenant_owner; this binds
-- tenant_admin to the same canonical dot-form catalog so a freshly-elevated
-- founder has full operational control of their workspace from minute 1.
--
-- Idempotent. Forward-only. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════
BEGIN;

DO $$
DECLARE
  v_role_id text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='platform_dauth' AND table_name='role_permissions') THEN
    RETURN;
  END IF;
  SELECT role_id INTO v_role_id FROM platform_dauth.functional_roles
   WHERE role_code = 'tenant_admin' LIMIT 1;
  IF v_role_id IS NULL THEN RETURN; END IF;
  EXECUTE format($sql$
    INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
    SELECT %L, p.permission_id FROM platform_dauth.permissions p
     WHERE p.permission_code IN (
       'access_review.read','access_review.write','ai_os.read','compliance.record.read',
       'governance.record.read','governance.record.write','risk.record.read',
       'workflow.record.read','workflow.record.write','privacy.record.read',
       'audit_trail.read','foundation.user.read','foundation.user.write',
       'foundation.org.read','foundation.org.write','foundation.record.read',
       'foundation.record.write','foundation.record.approve','foundation.record.delete',
       'foundation.admin','foundation.read','foundation.manage','foundation.system.manage')
       AND NOT EXISTS (
         SELECT 1 FROM platform_dauth.role_permissions rp
          WHERE rp.role_id = %L AND rp.permission_id = p.permission_id)
  $sql$, v_role_id, v_role_id);
END$$;

-- Self-test: tenant_admin must end up with all 23 canonical perms bound.
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n
    FROM platform_dauth.role_permissions rp
    JOIN platform_dauth.permissions p ON p.permission_id = rp.permission_id
   WHERE rp.role_id = 'tenant_admin'
     AND p.permission_code IN (
       'access_review.read','access_review.write','ai_os.read','compliance.record.read',
       'governance.record.read','governance.record.write','risk.record.read',
       'workflow.record.read','workflow.record.write','privacy.record.read',
       'audit_trail.read','foundation.user.read','foundation.user.write',
       'foundation.org.read','foundation.org.write','foundation.record.read',
       'foundation.record.write','foundation.record.approve','foundation.record.delete',
       'foundation.admin','foundation.read','foundation.manage','foundation.system.manage');
  IF n < 23 THEN
    RAISE EXCEPTION 'tenant_admin canonical bind incomplete: % / 23', n;
  END IF;
END$$;

COMMIT;
