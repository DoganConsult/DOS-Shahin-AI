-- =====================================================================
-- Platform-Admin module-role junction (20260502_0141) — Wave W2
--
-- 6NF child of dos.dynamic_ui_modules. Replaces a hypothetical
-- required_role_codes TEXT[] column on the catalog. Each row asserts a
-- single (module, role) grant with audit columns.
--
-- Idempotent. Seeds the canonical platform_admin / platform_super_admin
-- roles for the 9 DNA modules registered in 0140.
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS dos.platform_admin_module_roles (
  module_code  VARCHAR(100) NOT NULL REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE CASCADE,
  role_code    VARCHAR(80)  NOT NULL,
  granted_by   VARCHAR(120),
  granted_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_code, role_code)
);
CREATE INDEX IF NOT EXISTS ix_platform_admin_module_roles_role
  ON dos.platform_admin_module_roles (role_code);

-- Seed: platform_admin + platform_super_admin get all 9 DNA modules.
INSERT INTO dos.platform_admin_module_roles (module_code, role_code, granted_by)
SELECT m.module_code, r.role_code, 'migration:0141'
  FROM dos.dynamic_ui_modules m
 CROSS JOIN (VALUES ('platform_admin'), ('platform_super_admin')) AS r(role_code)
 WHERE m.module_code IN (
   'dauth','config-center','tenant-management','multi-tenant-mgmt',
   'foundation-admin','dos-platform','dnoc','dsoc','ai-platform'
 )
ON CONFLICT (module_code, role_code) DO NOTHING;

COMMIT;
