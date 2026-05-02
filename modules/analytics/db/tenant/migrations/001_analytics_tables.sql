-- Module: analytics | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL,
  snapshot_type TEXT NOT NULL, period_start DATE NOT NULL, period_end DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}', dimensions JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.analytics_snapshots
ALTER TABLE __TENANT_SCHEMA__.analytics_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.analytics_snapshots ADD COLUMN IF NOT EXISTS snapshot_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.analytics_snapshots ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE __TENANT_SCHEMA__.analytics_snapshots ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE __TENANT_SCHEMA__.analytics_snapshots ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.analytics_snapshots ADD COLUMN IF NOT EXISTS dimensions JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.analytics_snapshots ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL,
  title TEXT NOT NULL, report_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','failed')),
  config JSONB NOT NULL DEFAULT '{}', output_url TEXT,
  requested_by UUID NOT NULL, generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.analytics_reports
ALTER TABLE __TENANT_SCHEMA__.analytics_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.analytics_reports ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.analytics_reports ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.analytics_reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','failed'));
ALTER TABLE __TENANT_SCHEMA__.analytics_reports ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.analytics_reports ADD COLUMN IF NOT EXISTS output_url TEXT;
ALTER TABLE __TENANT_SCHEMA__.analytics_reports ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE __TENANT_SCHEMA__.analytics_reports ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.analytics_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_tenant ON __TENANT_SCHEMA__.analytics_snapshots(tenant_id, snapshot_type, period_end DESC);
