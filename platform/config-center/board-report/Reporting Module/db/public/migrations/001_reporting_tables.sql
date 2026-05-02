-- analytics-reporting-service owned tables
BEGIN;

CREATE TABLE IF NOT EXISTS dos.report_schedules (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(16) NOT NULL,
  title TEXT NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  schedule_cron TEXT,
  recipients TEXT[],
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_reports_tenant ON dos.report_schedules (tenant_id);

COMMIT;
