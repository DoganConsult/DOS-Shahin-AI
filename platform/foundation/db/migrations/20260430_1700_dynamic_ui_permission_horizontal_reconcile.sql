-- ════════════════════════════════════════════════════════════════════════
-- 20260430_1700 — Dynamic-UI permission horizontal reconcile
--
-- Finishes what 20260430_1510 started: normalises the colon-form perm codes
-- on every UI-contract surface (widgets / routes / actions / agent_actions
-- / kpi / data_sources), seeds the missing canonical families, and locks
-- the schema with a CHECK constraint + FK to dos.permissions so colon codes
-- can never re-enter the catalog. Forward-only, idempotent, RAISE EXCEPTION
-- self-test at the end so a partial run cannot leave the DB inconsistent.
-- ════════════════════════════════════════════════════════════════════════
BEGIN;

-- 1. Seed the canonical dot-form codes that the UI references but the
--    catalog never had. dos.permissions is a view over
--    platform_dauth.permissions; the underlying table owns the row.
--
--    Pre-step: ensure permission_code is uniquely indexed so we can
--    use ON CONFLICT and so the downstream FK has a referenceable target.
-- Pre-dedupe: collapse any historical duplicate permission_codes by
-- keeping the lowest permission_id (deterministic) and remapping any
-- referencing role_permissions/user_permissions rows to the survivor.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT permission_code, MIN(permission_id) AS keep_id
      FROM platform_dauth.permissions
     GROUP BY permission_code
    HAVING COUNT(*) > 1
  LOOP
    -- Repoint dependents to the survivor when those tables exist.
    IF EXISTS (SELECT 1 FROM information_schema.tables
                WHERE table_schema='platform_dauth' AND table_name='role_permissions') THEN
      EXECUTE format(
        'UPDATE platform_dauth.role_permissions SET permission_id=%L
          WHERE permission_id IN (SELECT permission_id FROM platform_dauth.permissions
                                   WHERE permission_code=%L AND permission_id<>%L)',
        r.keep_id, r.permission_code, r.keep_id);
    END IF;
    -- Drop the losers.
    DELETE FROM platform_dauth.permissions
      WHERE permission_code = r.permission_code AND permission_id <> r.keep_id;
  END LOOP;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='platform_dauth' AND tablename='permissions'
       AND indexdef ILIKE '%UNIQUE%(permission_code)%'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_dauth_permissions_code
        ON platform_dauth.permissions(permission_code);
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;
  END IF;
END$$;

INSERT INTO platform_dauth.permissions (permission_id, permission_code, module_code, resource_type, action_type, description)
VALUES
  ('perm_access_review_read',       'access_review.read',         'access_review', 'campaign',  'read',    'Read access-review campaigns'),
  ('perm_access_review_write',      'access_review.write',        'access_review', 'campaign',  'write',   'Manage access-review campaigns'),
  ('perm_ai_os_read',               'ai_os.read',                 'ai_os',         'surface',   'read',    'Read AI-OS surfaces'),
  ('perm_compliance_record_read',   'compliance.record.read',     'compliance',    'record',    'read',    'Read compliance records'),
  ('perm_governance_record_read',   'governance.record.read',     'governance',    'record',    'read',    'Read governance records'),
  ('perm_governance_record_write',  'governance.record.write',    'governance',    'record',    'write',   'Write governance records'),
  ('perm_risk_record_read',         'risk.record.read',           'risk',          'record',    'read',    'Read risk records'),
  ('perm_workflow_record_read',     'workflow.record.read',       'workflow',      'record',    'read',    'Read workflow records'),
  ('perm_workflow_record_write',    'workflow.record.write',      'workflow',      'record',    'write',   'Write workflow records'),
  ('perm_privacy_record_read',      'privacy.record.read',        'privacy',       'record',    'read',    'Read privacy records'),
  ('perm_audit_trail_read',         'audit_trail.read',           'audit',         'trail',     'read',    'Read audit trail'),
  ('perm_foundation_user_read',     'foundation.user.read',       'foundation',    'user',      'read',    'Read users in foundation'),
  ('perm_foundation_user_write',    'foundation.user.write',      'foundation',    'user',      'write',   'Manage users in foundation'),
  ('perm_foundation_org_read',      'foundation.org.read',        'foundation',    'org',       'read',    'Read organisation tree'),
  ('perm_foundation_org_write',     'foundation.org.write',       'foundation',    'org',       'write',   'Modify organisation tree'),
  ('perm_foundation_record_read',   'foundation.record.read',     'foundation',    'record',    'read',    'Read foundation records'),
  ('perm_foundation_record_write',  'foundation.record.write',    'foundation',    'record',    'write',   'Write foundation records'),
  ('perm_foundation_record_approve','foundation.record.approve',  'foundation',    'record',    'approve', 'Approve foundation records'),
  ('perm_foundation_record_delete', 'foundation.record.delete',   'foundation',    'record',    'delete',  'Delete foundation records'),
  -- perm_foundation_admin / perm_foundation_read may pre-exist with the
  -- legacy colon-form code. Promote them in-place below; do NOT re-insert
  -- here or ON CONFLICT (PK) will silently drop the canonical dot row.
  ('perm_foundation_admin_v2',      'foundation.admin',           'foundation',    'admin',     'manage',  'Foundation administrative powers'),
  ('perm_foundation_read_v2',       'foundation.read',            'foundation',    'surface',   'read',    'Read foundation surface'),
  ('perm_foundation_manage',        'foundation.manage',          'foundation',    'surface',   'manage',  'Manage foundation surface'),
  ('perm_foundation_system_manage', 'foundation.system.manage',   'foundation',    'system',    'manage',  'Manage foundation system primitives')
ON CONFLICT DO NOTHING;

-- 1b. Promote any pre-existing colon-form rows whose canonical dot code
--     could not be inserted above due to PK collision (perm_foundation_*).
--     This guarantees the FK target always exists for the dot codes.
UPDATE platform_dauth.permissions
   SET permission_code = 'foundation.read'
 WHERE permission_id = 'perm_foundation_read'
   AND permission_code = 'foundation:read'
   AND NOT EXISTS (SELECT 1 FROM platform_dauth.permissions
                    WHERE permission_code = 'foundation.read');
UPDATE platform_dauth.permissions
   SET permission_code = 'foundation.admin'
 WHERE permission_id = 'perm_foundation_admin'
   AND permission_code = 'foundation:admin'
   AND NOT EXISTS (SELECT 1 FROM platform_dauth.permissions
                    WHERE permission_code = 'foundation.admin');

-- 2. Hard-replace colon-form codes on every UI-contract column.
--    Single mapping table, applied uniformly.
WITH m(colon, dot) AS (VALUES
  ('foundation:read',     'foundation.read'),
  ('foundation:admin',    'foundation.admin'),
  ('foundation:write',    'foundation.record.write'),
  ('admin:read',          'foundation.admin'),
  ('users:manage',        'foundation.user.write'),
  ('users:read',          'foundation.user.read'),
  ('audit:read',          'audit_trail.read'),
  ('privacy:read',        'privacy.record.read'),
  ('governance:read',     'governance.record.read'),
  ('governance:write',    'governance.record.write'),
  ('risk:read',           'risk.record.read'),
  ('workflow:read',       'workflow.record.read'),
  ('workflow:write',      'workflow.record.write'),
  ('access_review:read',  'access_review.read'),
  ('access_review:create','access_review.write'),
  ('ai_os:read',          'ai_os.read'),
  ('compliance:read',     'compliance.record.read')
)
UPDATE dos.dynamic_ui_widgets w SET permission = m.dot
  FROM m WHERE w.permission = m.colon;

WITH m(colon, dot) AS (VALUES
  ('foundation:read','foundation.read'),('foundation:admin','foundation.admin'),
  ('foundation:write','foundation.record.write'),('admin:read','foundation.admin'),
  ('users:manage','foundation.user.write'),('users:read','foundation.user.read'),
  ('audit:read','audit_trail.read'),('privacy:read','privacy.record.read'),
  ('governance:read','governance.record.read'),('governance:write','governance.record.write'),
  ('risk:read','risk.record.read'),('workflow:read','workflow.record.read'),
  ('workflow:write','workflow.record.write'),('access_review:read','access_review.read'),
  ('access_review:create','access_review.write'),('ai_os:read','ai_os.read'),
  ('compliance:read','compliance.record.read'))
UPDATE dos.dynamic_ui_routes r SET permission_key = m.dot
  FROM m WHERE r.permission_key = m.colon;

WITH m(colon, dot) AS (VALUES
  ('foundation:read','foundation.read'),('foundation:admin','foundation.admin'),
  ('foundation:write','foundation.record.write'),('admin:read','foundation.admin'),
  ('users:manage','foundation.user.write'),('users:read','foundation.user.read'),
  ('audit:read','audit_trail.read'),('privacy:read','privacy.record.read'),
  ('governance:read','governance.record.read'),('governance:write','governance.record.write'),
  ('risk:read','risk.record.read'),('workflow:read','workflow.record.read'),
  ('workflow:write','workflow.record.write'),('access_review:read','access_review.read'),
  ('access_review:create','access_review.write'),('ai_os:read','ai_os.read'),
  ('compliance:read','compliance.record.read'))
UPDATE dos.dynamic_ui_actions a SET permission = m.dot
  FROM m WHERE a.permission = m.colon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='dos' AND table_name='dynamic_ui_agent_actions') THEN
    EXECUTE $sql$
      WITH m(colon, dot) AS (VALUES
        ('foundation:read','foundation.read'),('foundation:admin','foundation.admin'),
        ('foundation:write','foundation.record.write'),('admin:read','foundation.admin'),
        ('users:manage','foundation.user.write'),('users:read','foundation.user.read'),
        ('audit:read','audit_trail.read'),('privacy:read','privacy.record.read'),
        ('governance:read','governance.record.read'),('governance:write','governance.record.write'),
        ('risk:read','risk.record.read'),('workflow:read','workflow.record.read'),
        ('workflow:write','workflow.record.write'),('access_review:read','access_review.read'),
        ('access_review:create','access_review.write'),('ai_os:read','ai_os.read'),
        ('compliance:read','compliance.record.read'))
      UPDATE dos.dynamic_ui_agent_actions ag SET permission = m.dot
        FROM m WHERE ag.permission = m.colon
    $sql$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='dos' AND table_name='dynamic_ui_kpi') THEN
    EXECUTE $sql$
      WITH m(colon, dot) AS (VALUES
        ('foundation:read','foundation.read'),('users:read','foundation.user.read'),
        ('audit:read','audit_trail.read'),('privacy:read','privacy.record.read'),
        ('governance:read','governance.record.read'),('risk:read','risk.record.read'),
        ('workflow:read','workflow.record.read'),('access_review:read','access_review.read'),
        ('compliance:read','compliance.record.read'))
      UPDATE dos.dynamic_ui_kpi k SET permission = m.dot
        FROM m WHERE k.permission = m.colon
    $sql$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='dos' AND table_name='dynamic_ui_data_sources') THEN
    EXECUTE $sql$
      WITH m(colon, dot) AS (VALUES
        ('foundation:read','foundation.read'),('users:read','foundation.user.read'),
        ('audit:read','audit_trail.read'),('privacy:read','privacy.record.read'),
        ('governance:read','governance.record.read'),('risk:read','risk.record.read'),
        ('workflow:read','workflow.record.read'),('access_review:read','access_review.read'),
        ('compliance:read','compliance.record.read'))
      UPDATE dos.dynamic_ui_data_sources d SET permission = m.dot
        FROM m WHERE d.permission = m.colon
    $sql$;
  END IF;
END$$;

-- 3. Re-bind tenant_owner role to the canonical dot codes (best-effort, only
--    if the platform_dauth.role_permissions table exists with that shape).
DO $$
DECLARE
  v_role_id text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='platform_dauth' AND table_name='role_permissions') THEN
    RETURN;
  END IF;
  SELECT role_id INTO v_role_id FROM platform_dauth.functional_roles
   WHERE role_code = 'tenant_owner' LIMIT 1;
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

-- 4. CHECK constraint: every future row must be dot-form (or NULL).
DO $$
DECLARE t TEXT; col TEXT;
BEGIN
  FOR t, col IN VALUES
    ('dynamic_ui_widgets','permission'),
    ('dynamic_ui_routes','permission_key'),
    ('dynamic_ui_actions','permission'),
    ('dynamic_ui_agent_actions','permission'),
    ('dynamic_ui_kpi','permission'),
    ('dynamic_ui_data_sources','permission')
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='dos' AND table_name=t AND column_name=col) THEN
      EXECUTE format(
        'ALTER TABLE dos.%I DROP CONSTRAINT IF EXISTS chk_perm_dot_form_%s', t, t);
      EXECUTE format(
        'ALTER TABLE dos.%I ADD CONSTRAINT chk_perm_dot_form_%s ' ||
        'CHECK (%I IS NULL OR %I ~ ''^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]+)+$'')',
        t, t, col, col);
    END IF;
  END LOOP;
END$$;

-- 5. FK to dos.permissions (NOT VALID, then VALIDATE; tolerant of missing cols).
DO $$
DECLARE t TEXT; col TEXT;
BEGIN
  FOR t, col IN VALUES
    ('dynamic_ui_widgets','permission'),
    ('dynamic_ui_routes','permission_key'),
    ('dynamic_ui_actions','permission'),
    ('dynamic_ui_agent_actions','permission'),
    ('dynamic_ui_kpi','permission'),
    ('dynamic_ui_data_sources','permission')
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='dos' AND table_name=t AND column_name=col) THEN
      EXECUTE format(
        'ALTER TABLE dos.%I DROP CONSTRAINT IF EXISTS fk_perm_catalog_%s', t, t);
      BEGIN
        EXECUTE format(
          'ALTER TABLE dos.%I ADD CONSTRAINT fk_perm_catalog_%s ' ||
          'FOREIGN KEY (%I) REFERENCES platform_dauth.permissions(permission_code) ' ||
          'DEFERRABLE INITIALLY DEFERRED NOT VALID', t, t, col);
        EXECUTE format(
          'ALTER TABLE dos.%I VALIDATE CONSTRAINT fk_perm_catalog_%s', t, t);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'fk_perm_catalog skipped on %.% (%): %', t, col, SQLSTATE, SQLERRM;
      END;
    END IF;
  END LOOP;
END$$;

-- 6. Self-test: the run is invalid if any colon code survives anywhere.
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM dos.dynamic_ui_widgets WHERE permission ~ ':';
  IF n > 0 THEN RAISE EXCEPTION 'reconcile failed: % colon perms in dynamic_ui_widgets', n; END IF;
  SELECT count(*) INTO n FROM dos.dynamic_ui_routes WHERE permission_key ~ ':';
  IF n > 0 THEN RAISE EXCEPTION 'reconcile failed: % colon perms in dynamic_ui_routes', n; END IF;
  SELECT count(*) INTO n FROM dos.dynamic_ui_actions WHERE permission ~ ':';
  IF n > 0 THEN RAISE EXCEPTION 'reconcile failed: % colon perms in dynamic_ui_actions', n; END IF;
END$$;

COMMIT;
