-- Align dos.dynamic_ui_navigation schema with the contract expected by
-- the 13 AI-phase seed migrations (20260511_1500..1512). Idempotent.
-- Adds:
--   * updated_at column (referenced by ON CONFLICT ... DO UPDATE SET updated_at = NOW())
--   * unique index on (COALESCE(tenant_id,'*'), module_code, route) so the
--     ON CONFLICT (tenant_id, module_code, route) clause has a matching
--     arbiter index (NULL tenant_id = global publisher row).

BEGIN;

ALTER TABLE dos.dynamic_ui_navigation
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

DROP INDEX IF EXISTS dos.ux_dui_nav_scope;
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_nav_tenant_module_route
  ON dos.dynamic_ui_navigation (tenant_id, module_code, route)
  NULLS NOT DISTINCT;

COMMIT;
