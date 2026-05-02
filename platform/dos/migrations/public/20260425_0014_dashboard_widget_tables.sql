-- =====================================================================
-- Dashboard widget catalogue + tenant pins (20260425_0014)
--
-- Backs modules/dashboard/source/backend/agrc-engine/routes/agrc-os/
--   dashboard-widgets.routes.ts — GET /catalogue returns the platform-wide
-- widget catalogue; GET /pinned returns per-tenant pins; PUT /pinned
-- upserts the ordered pin list.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.dashboard_widgets (
  widget_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  VARCHAR(128) NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  description           TEXT,
  category              TEXT NOT NULL DEFAULT 'general',
  module                TEXT,
  default_layout        JSONB NOT NULL DEFAULT '{}'::jsonb,
  permissions_required  TEXT[] NOT NULL DEFAULT '{}',
  published_at          TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dos_dashboard_widgets_category
  ON dos.dashboard_widgets(category) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.tenant_dashboard_widget_pins (
  pin_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             VARCHAR(64) NOT NULL,
  widget_code           VARCHAR(128) NOT NULL,
  position              INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dos_tenant_dashboard_widget_pins_tenant_widget
  ON dos.tenant_dashboard_widget_pins(tenant_id, widget_code)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dos_tenant_dashboard_widget_pins_order
  ON dos.tenant_dashboard_widget_pins(tenant_id, position);

DO $grants$
DECLARE
  service_role TEXT;
  tbl TEXT;
  -- Real roles in shahin_grc — see 20260425_0010 header.
  write_roles TEXT[] := ARRAY[
    'dos_user', 'dos_ai', 'dos_workflow', 'dos_audit', 'dos_tenant',
    'dos_notification', 'dos_auth', 'dos_migrator'
  ];
  tables TEXT[] := ARRAY[
    'dashboard_widgets', 'tenant_dashboard_widget_pins'
  ];
BEGIN
  FOREACH service_role IN ARRAY write_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = service_role) THEN
      FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.%I TO %I',
          tbl, service_role
        );
      END LOOP;
    END IF;
  END LOOP;
END $grants$;

COMMIT;
