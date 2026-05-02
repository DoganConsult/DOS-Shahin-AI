-- Module: vendor | Migration: 001
-- Enterprise Production Grade Schema
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100),
    tier            VARCHAR(50) DEFAULT 'unassigned',
    status          VARCHAR(50) NOT NULL DEFAULT 'prospect',
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(50),
    sla_notes       TEXT,
    risk_score      NUMERIC(5,2),
    created_by      UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_profiles
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'unassigned';
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'prospect';
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS sla_notes TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_engagements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    vendor_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    contract_value  NUMERIC(15,2),
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    renewal_type    VARCHAR(50) DEFAULT 'manual',
    status          VARCHAR(50) DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_engagements
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS contract_value NUMERIC(15,2);
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS renewal_type VARCHAR(50) DEFAULT 'manual';
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.vendor_engagements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_due_diligence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    vendor_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
    scope           TEXT,
    due_date        TIMESTAMPTZ,
    assigned_to     UUID,
    status          VARCHAR(50) DEFAULT 'pending',
    findings        JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_due_diligence
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence ADD COLUMN IF NOT EXISTS findings JSONB DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.vendor_due_diligence ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_sla_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    vendor_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
    metric_name     VARCHAR(255) NOT NULL,
    target_value    NUMERIC(10,2) NOT NULL,
    actual_value    NUMERIC(10,2) NOT NULL,
    measurement_date DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_sla_metrics
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_metrics ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_metrics ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_metrics ADD COLUMN IF NOT EXISTS metric_name VARCHAR(255);
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_metrics ADD COLUMN IF NOT EXISTS target_value NUMERIC(10,2);
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_metrics ADD COLUMN IF NOT EXISTS actual_value NUMERIC(10,2);
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_metrics ADD COLUMN IF NOT EXISTS measurement_date DATE;
ALTER TABLE __TENANT_SCHEMA__.vendor_sla_metrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.vendor_lifecycle_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    vendor_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE,
    action          VARCHAR(255) NOT NULL,
    actor_id        UUID NOT NULL,
    from_status     VARCHAR(50),
    to_status       VARCHAR(50),
    comments        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.vendor_lifecycle_logs
ALTER TABLE __TENANT_SCHEMA__.vendor_lifecycle_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_lifecycle_logs ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES __TENANT_SCHEMA__.vendor_profiles(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.vendor_lifecycle_logs ADD COLUMN IF NOT EXISTS action VARCHAR(255);
ALTER TABLE __TENANT_SCHEMA__.vendor_lifecycle_logs ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE __TENANT_SCHEMA__.vendor_lifecycle_logs ADD COLUMN IF NOT EXISTS from_status VARCHAR(50);
ALTER TABLE __TENANT_SCHEMA__.vendor_lifecycle_logs ADD COLUMN IF NOT EXISTS to_status VARCHAR(50);
ALTER TABLE __TENANT_SCHEMA__.vendor_lifecycle_logs ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE __TENANT_SCHEMA__.vendor_lifecycle_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_tenant ON __TENANT_SCHEMA__.vendor_profiles(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_eng_vendor ON __TENANT_SCHEMA__.vendor_engagements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_dd_vendor ON __TENANT_SCHEMA__.vendor_due_diligence(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_logs_vendor ON __TENANT_SCHEMA__.vendor_lifecycle_logs(vendor_id);
