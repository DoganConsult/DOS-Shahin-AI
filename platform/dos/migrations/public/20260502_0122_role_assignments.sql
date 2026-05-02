-- dos:draft
-- =====================================================================
-- UI-OS — §15 Security — role assignments to layouts/dashboards/navigation  (20260502_0122)
--
-- Tables (3) — 3NF: target by FK UUID where possible (layout_template_id,
-- dashboard_id); navigation node by key only since nav_node_key is the
-- natural identifier in dynamic_ui_navigation.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_role_layout_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             VARCHAR(64) NOT NULL,
  role_code             VARCHAR(100) NOT NULL,
  layout_template_id    UUID NOT NULL,
  is_default            BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_role_layout_assignments_layout_fk
    FOREIGN KEY (layout_template_id) REFERENCES dos.ui_layout_templates(id) ON DELETE CASCADE,
  CONSTRAINT ui_role_layout_assignments_uk
    UNIQUE (tenant_id, role_code, layout_template_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_role_layout_assignments_role
  ON dos.ui_role_layout_assignments (tenant_id, role_code);

CREATE TABLE IF NOT EXISTS dos.ui_role_dashboard_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  role_code       VARCHAR(100) NOT NULL,
  dashboard_id    UUID NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_role_dashboard_assignments_dashboard_fk
    FOREIGN KEY (dashboard_id) REFERENCES dos.ui_dashboards(id) ON DELETE CASCADE,
  CONSTRAINT ui_role_dashboard_assignments_uk
    UNIQUE (tenant_id, role_code, dashboard_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_role_dashboard_assignments_role
  ON dos.ui_role_dashboard_assignments (tenant_id, role_code);

CREATE TABLE IF NOT EXISTS dos.ui_role_navigation_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  role_code       VARCHAR(100) NOT NULL,
  nav_node_key    VARCHAR(150) NOT NULL,
  effect          dos.ui_perm_effect_t NOT NULL DEFAULT 'allow',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_role_navigation_assignments_uk
    UNIQUE (tenant_id, role_code, nav_node_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_role_navigation_assignments_role
  ON dos.ui_role_navigation_assignments (tenant_id, role_code);

COMMIT;
