-- Module: policy | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  policy_ref      TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  policy_type     TEXT NOT NULL DEFAULT 'internal',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','active','archived','superseded')),
  version         INTEGER NOT NULL DEFAULT 1,
  category        TEXT,
  owner_id        UUID,
  approver_id     UUID,
  approved_at     TIMESTAMPTZ,
  effective_date  DATE,
  review_date     DATE,
  expiry_date     DATE,
  content         TEXT,
  content_url     TEXT,
  framework_refs  JSONB NOT NULL DEFAULT '[]',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policies
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS policy_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS policy_type TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','under_review','approved','active','archived','superseded'));
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS approver_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS review_date DATE;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS content_url TEXT;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS framework_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_obligations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  policy_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.policies(id) ON DELETE CASCADE,
  obligation_text TEXT NOT NULL,
  obligation_type TEXT NOT NULL,
  owner_id        UUID,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_obligations
ALTER TABLE __TENANT_SCHEMA__.policy_obligations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_obligations ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES __TENANT_SCHEMA__.policies(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.policy_obligations ADD COLUMN IF NOT EXISTS obligation_text TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_obligations ADD COLUMN IF NOT EXISTS obligation_type TEXT;
ALTER TABLE __TENANT_SCHEMA__.policy_obligations ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_obligations ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.policy_obligations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE __TENANT_SCHEMA__.policy_obligations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.policy_attestations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  policy_id       UUID NOT NULL REFERENCES __TENANT_SCHEMA__.policies(id),
  user_id         UUID NOT NULL,
  attested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attestation_type TEXT NOT NULL DEFAULT 'read_and_understood',
  expires_at      TIMESTAMPTZ,
  notes           TEXT
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.policy_attestations
ALTER TABLE __TENANT_SCHEMA__.policy_attestations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_attestations ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES __TENANT_SCHEMA__.policies(id);
ALTER TABLE __TENANT_SCHEMA__.policy_attestations ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE __TENANT_SCHEMA__.policy_attestations ADD COLUMN IF NOT EXISTS attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.policy_attestations ADD COLUMN IF NOT EXISTS attestation_type TEXT NOT NULL DEFAULT 'read_and_understood';
ALTER TABLE __TENANT_SCHEMA__.policy_attestations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE __TENANT_SCHEMA__.policy_attestations ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE INDEX IF NOT EXISTS idx_policies_tenant ON __TENANT_SCHEMA__.policies(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_policy_attestations_user ON __TENANT_SCHEMA__.policy_attestations(tenant_id, user_id);
