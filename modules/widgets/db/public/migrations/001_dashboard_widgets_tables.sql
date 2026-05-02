-- dashboard-widgets-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.widgets (
  widget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  title TEXT NOT NULL,
  widget_type VARCHAR(100) NOT NULL,
  config JSONB DEFAULT '{}',
  data_source VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_widgets_tenant ON dos.widgets (tenant_id);

COMMIT;
