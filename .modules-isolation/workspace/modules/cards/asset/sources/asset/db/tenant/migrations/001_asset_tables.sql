-- Module: asset | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL,
  asset_ref TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
  asset_type TEXT NOT NULL, category TEXT, sub_category TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','retired','disposed')),
  criticality TEXT NOT NULL DEFAULT 'medium' CHECK (criticality IN ('low','medium','high','critical')),
  owner_id UUID, custodian_id UUID,
  location TEXT, acquisition_date DATE, retirement_date DATE,
  value NUMERIC(15,2), currency TEXT DEFAULT 'USD',
  data_classification TEXT, is_pii BOOLEAN DEFAULT FALSE, is_regulated BOOLEAN DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}', tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.assets
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS asset_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS asset_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','retired','disposed'));
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS criticality TEXT NOT NULL DEFAULT 'medium' CHECK (criticality IN ('low','medium','high','critical'));
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS custodian_id UUID;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS acquisition_date DATE;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS retirement_date DATE;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS value NUMERIC(15,2);
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS data_classification TEXT;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS is_pii BOOLEAN DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS is_regulated BOOLEAN DEFAULT FALSE;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.asset_risk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES __TENANT_SCHEMA__.assets(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL, link_type TEXT NOT NULL DEFAULT 'exposed_to',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, risk_id)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.asset_risk_links
ALTER TABLE __TENANT_SCHEMA__.asset_risk_links ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.asset_risk_links ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES __TENANT_SCHEMA__.assets(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.asset_risk_links ADD COLUMN IF NOT EXISTS risk_id UUID;
ALTER TABLE __TENANT_SCHEMA__.asset_risk_links ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'exposed_to';
ALTER TABLE __TENANT_SCHEMA__.asset_risk_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_assets_tenant ON __TENANT_SCHEMA__.assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_type ON __TENANT_SCHEMA__.assets(asset_type, criticality);
