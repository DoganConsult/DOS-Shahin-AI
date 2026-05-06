-- ═══════════════════════════════════════════════════════════════════
-- Foundation Horizontal Closure — permission code normalization
--
-- Canonical Foundation permission format is DOT style. Backend
-- requirePermission(...) already enforces dot style; this migration
-- makes dot style the ONLY active role/guard/enforcement truth.
--
-- Foundation canonical dot codes (single source of truth):
--   foundation.read
--   foundation.admin
--   foundation.manage
--   foundation.system.manage
--   foundation.org.read
--   foundation.org.write
--   foundation.user.read
--   foundation.user.write
--   foundation.record.read
--   foundation.record.write
--   foundation.record.approve
--   foundation.record.delete
--   audit_trail.read
--
-- Strategy:
--   1. Insert/upsert canonical DOT permission catalog rows.
--   2. REPLACE colon codes inside platform_dauth.functional_roles.permissions[]
--      with their explicit dot equivalents (no append-both compatibility).
--   3. DELETE colon platform_dauth.role_permissions rows; INSERT dot rows.
--   4. Mark the legacy colon catalog rows as DEPRECATED (description prefix)
--      and unbind them from every active role. They remain in the catalog
--      for forensic/audit lookup only — never as active grants.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

DO $reconcile$
DECLARE
  has_perms BOOLEAN;
  has_roles BOOLEAN;
  has_rp    BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'platform_dauth' AND table_name = 'permissions'
  ) INTO has_perms;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'platform_dauth' AND table_name = 'functional_roles'
  ) INTO has_roles;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'platform_dauth' AND table_name = 'role_permissions'
  ) INTO has_rp;

  IF NOT has_perms OR NOT has_roles THEN
    RAISE NOTICE '[foundation-perm-reconcile] platform_dauth.{permissions,functional_roles} missing — skipping';
    RETURN;
  END IF;

  -- ── 1. Canonical DOT permission catalog rows ─────────────────────────
  INSERT INTO platform_dauth.permissions
    (permission_id,                    permission_code,             module_code,  resource_type,        action_type, description)
  VALUES
    ('perm_foundation_read',           'foundation.read',           'foundation', 'foundation',         'read',    'Read foundation surface (canonical).'),
    ('perm_foundation_admin',          'foundation.admin',          'foundation', 'foundation',         'admin',   'Administer Foundation (settings, ops readiness, lifecycle).'),
    ('perm_foundation_manage',         'foundation.manage',         'foundation', 'foundation',         'manage',  'Manage foundation configuration & ops readiness.'),
    ('perm_foundation_system_manage',  'foundation.system.manage',  'foundation', 'system',             'manage',  'Manage foundation system-level configuration.'),
    ('perm_foundation_org_read',       'foundation.org.read',       'foundation', 'organization',       'read',    'Read foundation organization structure.'),
    ('perm_foundation_org_write',      'foundation.org.write',      'foundation', 'organization',       'update',  'Write foundation organization structure.'),
    ('perm_foundation_user_read',      'foundation.user.read',      'foundation', 'user',               'read',    'Read foundation users.'),
    ('perm_foundation_user_write',     'foundation.user.write',     'foundation', 'user',               'update',  'Manage foundation users (create/update/deactivate/reset).'),
    ('perm_foundation_record_read',    'foundation.record.read',    'foundation', 'foundation_record',  'read',    'Read foundation records.'),
    ('perm_foundation_record_write',   'foundation.record.write',   'foundation', 'foundation_record',  'update',  'Write foundation records.'),
    ('perm_foundation_record_approve', 'foundation.record.approve', 'foundation', 'foundation_record',  'approve', 'Approve foundation records.'),
    ('perm_foundation_record_delete',  'foundation.record.delete',  'foundation', 'foundation_record',  'delete',  'Delete foundation records.'),
    ('perm_audit_trail_read',          'audit_trail.read',          'foundation', 'audit_trail',        'read',    'Read foundation audit trail entries.')
  ON CONFLICT (permission_code) DO UPDATE
    SET permission_code = EXCLUDED.permission_code,
        module_code     = EXCLUDED.module_code,
        resource_type   = EXCLUDED.resource_type,
        action_type     = EXCLUDED.action_type,
        description     = EXCLUDED.description;

  -- ── 2. Hard-replace colon codes in functional_roles.permissions[]. ────
  --       Every Foundation-scoped colon code becomes its explicit dot
  --       equivalent. No colon code is allowed to remain in any active
  --       role grant after this step.
  WITH alias_map(colon, dot) AS (VALUES
    ('foundation:read',    'foundation.read'),
    ('foundation:write',   'foundation.record.write'),
    ('foundation:delete',  'foundation.record.delete'),
    ('foundation:approve', 'foundation.record.approve'),
    ('foundation:manage',  'foundation.manage'),
    ('foundation:admin',   'foundation.admin'),
    ('users:manage',       'foundation.user.write'),
    ('admin:read',         'foundation.admin'),
    ('audit:read',         'audit_trail.read')
  )
  UPDATE platform_dauth.functional_roles fr
     SET permissions = (
       SELECT ARRAY(
         SELECT DISTINCT COALESCE(am.dot, p)
           FROM unnest(COALESCE(fr.permissions, '{}'::text[])) AS p
           LEFT JOIN alias_map am ON am.colon = p
       )
     )
   WHERE EXISTS (
     SELECT 1 FROM unnest(COALESCE(fr.permissions, '{}'::text[])) AS p
      WHERE p IN ('foundation:read','foundation:write','foundation:delete',
                  'foundation:approve','foundation:manage','foundation:admin',
                  'users:manage','admin:read','audit:read')
   );

  -- ── 3. Promote tenant_owner / platform_admin / platform_super_admin /
  --       tenant_admin / dos_admin to carry the full canonical Foundation
  --       dot set so write/admin actions enforced by requirePermission
  --       pass without the platform-admin bypass.
  UPDATE platform_dauth.functional_roles fr
     SET permissions = (
       SELECT ARRAY(
         SELECT DISTINCT p FROM unnest(
           COALESCE(fr.permissions, '{}'::text[])
           || ARRAY[
             'foundation.read','foundation.admin','foundation.manage',
             'foundation.system.manage',
             'foundation.org.read','foundation.org.write',
             'foundation.user.read','foundation.user.write',
             'foundation.record.read','foundation.record.write',
             'foundation.record.approve','foundation.record.delete',
             'audit_trail.read'
           ]
         ) AS p
       )
     )
   WHERE fr.role_code IN ('platform_super_admin','platform_admin','tenant_owner','tenant_admin','dos_admin');

  -- org_admin: full read + org/user write + audit read.
  UPDATE platform_dauth.functional_roles fr
     SET permissions = (
       SELECT ARRAY(
         SELECT DISTINCT p FROM unnest(
           COALESCE(fr.permissions, '{}'::text[])
           || ARRAY[
             'foundation.read','foundation.org.read','foundation.org.write',
             'foundation.user.read','foundation.user.write',
             'foundation.record.read','audit_trail.read'
           ]
         ) AS p
       )
     )
   WHERE fr.role_code = 'org_admin';

  -- hr_admin: read + user write.
  UPDATE platform_dauth.functional_roles fr
     SET permissions = (
       SELECT ARRAY(
         SELECT DISTINCT p FROM unnest(
           COALESCE(fr.permissions, '{}'::text[])
           || ARRAY['foundation.read','foundation.user.read','foundation.user.write']
         ) AS p
       )
     )
   WHERE fr.role_code = 'hr_admin';

  -- viewer / auditor / standard_user: read-only.
  UPDATE platform_dauth.functional_roles fr
     SET permissions = (
       SELECT ARRAY(
         SELECT DISTINCT p FROM unnest(
           COALESCE(fr.permissions, '{}'::text[])
           || ARRAY['foundation.read','audit_trail.read']
         ) AS p
       )
     )
   WHERE fr.role_code IN ('viewer','auditor','standard_user');

  -- ── 4. Re-bind role_permissions for the canonical dot codes. ─────────
  IF has_rp THEN
    -- 4a. Remove role_permissions rows that point to colon-style codes.
    DELETE FROM platform_dauth.role_permissions rp
     USING platform_dauth.permissions p
     WHERE rp.permission_id = p.permission_id
       AND p.permission_code IN (
         'foundation:read','foundation:write','foundation:delete',
         'foundation:approve','foundation:manage','foundation:admin',
         'users:manage','admin:read','audit:read'
       );

    -- 4b. Insert role_permissions rows for the canonical dot codes that
    --     each role now carries in its permissions[] array.
    INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
    SELECT fr.role_id, p.permission_id
      FROM platform_dauth.functional_roles fr
      JOIN LATERAL unnest(fr.permissions) AS pc(permission_code) ON TRUE
      JOIN platform_dauth.permissions p ON p.permission_code = pc.permission_code
     WHERE NOT EXISTS (
       SELECT 1 FROM platform_dauth.role_permissions rp
        WHERE rp.role_id = fr.role_id AND rp.permission_id = p.permission_id
     );
  END IF;

  -- ── 5. Mark legacy colon catalog rows as DEPRECATED. They remain in
  --       the catalog for forensic/audit lookup only — never as active
  --       grants (already removed from role_permissions and roles[]).
  UPDATE platform_dauth.permissions
     SET description = CASE
       WHEN description IS NULL OR description = '' THEN '[DEPRECATED — use dot-style canonical code] '
       WHEN description ILIKE '[DEPRECATED%' THEN description
       ELSE '[DEPRECATED — use dot-style canonical code] ' || description
     END
   WHERE permission_code IN (
     'foundation:read','foundation:write','foundation:delete',
     'foundation:approve','foundation:manage','foundation:admin',
     'users:manage','admin:read','audit:read'
   );
END;
$reconcile$;

COMMIT;
