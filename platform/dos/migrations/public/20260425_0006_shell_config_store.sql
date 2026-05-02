-- =====================================================================
-- Shell configuration store (20260425_0006)
--
-- Backs /api/shell/config/* — the UI shell layer where platform
-- defaults / tenant overrides / role overrides / user preferences are
-- merged (later wins) per (module_code, product_code).
--
-- Consumers:
--   services/dashboard-widgets-service → modules/dashboard →
--   shell-config.routes.ts → services/shell-config.service.ts
--
-- Scope precedence (lowest → highest):
--   1. platform : tenant_id = '*', scope_type = 'platform'
--   2. tenant   : scope_type = 'tenant'
--   3. role     : scope_type = 'role',  scope_key = role_code
--   4. user     : scope_type = 'user',  scope_key = user_id
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.shell_config (
  config_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  scope_type    VARCHAR(20) NOT NULL
                CHECK (scope_type IN ('platform', 'tenant', 'role', 'user')),
  scope_key     VARCHAR(200),
  module_code   VARCHAR(100) NOT NULL,
  product_code  VARCHAR(100),
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    VARCHAR(64)
);

-- One row per unique scope tuple. Platform-scope rows use tenant_id='*'
-- so the unique index still discriminates between tenant-less defaults
-- and per-tenant platform copies — but in practice the seed writes only
-- tenant_id='*' for scope_type='platform'.
CREATE UNIQUE INDEX IF NOT EXISTS ux_dos_shell_config_scope
  ON dos.shell_config (tenant_id, scope_type, COALESCE(scope_key, ''), module_code, COALESCE(product_code, ''));

CREATE INDEX IF NOT EXISTS ix_dos_shell_config_tenant_module
  ON dos.shell_config (tenant_id, module_code, product_code);

COMMIT;
