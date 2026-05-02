-- Module: compliance | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_frameworks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  version         TEXT,
  authority       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_frameworks
ALTER TABLE __TENANT_SCHEMA__.compliance_frameworks ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_frameworks ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_frameworks ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_frameworks ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_frameworks ADD COLUMN IF NOT EXISTS authority TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_frameworks ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.compliance_frameworks ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.compliance_frameworks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_requirements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  framework_id    UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id) ON DELETE CASCADE,
  ref_code        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  criticality     TEXT NOT NULL DEFAULT 'medium' CHECK (criticality IN ('low','medium','high','critical')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_requirements
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS ref_code TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS criticality TEXT NOT NULL DEFAULT 'medium' CHECK (criticality IN ('low','medium','high','critical'));
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE __TENANT_SCHEMA__.compliance_requirements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  framework_id    UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id),
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','under_review','completed','closed')),
  assessment_date DATE,
  scope           TEXT,
  assessor_id     UUID,
  overall_score   NUMERIC(5,2),
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_assessments
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id);
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','under_review','completed','closed'));
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS assessment_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS assessor_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS overall_score NUMERIC(5,2);
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_gaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  assessment_id   UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_assessments(id) ON DELETE CASCADE,
  requirement_id  UUID NOT NULL REFERENCES __TENANT_SCHEMA__.compliance_requirements(id),
  gap_status      TEXT NOT NULL DEFAULT 'open' CHECK (gap_status IN ('open','in_remediation','closed','accepted')),
  compliance_level TEXT NOT NULL DEFAULT 'non_compliant' CHECK (compliance_level IN ('fully_compliant','partially_compliant','non_compliant','not_applicable')),
  finding_text    TEXT,
  remediation_plan TEXT,
  due_date        DATE,
  owner_id        UUID,
  evidence_refs   JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_gaps
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES __TENANT_SCHEMA__.compliance_assessments(id) ON DELETE CASCADE;
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES __TENANT_SCHEMA__.compliance_requirements(id);
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS gap_status TEXT NOT NULL DEFAULT 'open' CHECK (gap_status IN ('open','in_remediation','closed','accepted'));
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS compliance_level TEXT NOT NULL DEFAULT 'non_compliant' CHECK (compliance_level IN ('fully_compliant','partially_compliant','non_compliant','not_applicable'));
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS finding_text TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS remediation_plan TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_gaps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.compliance_obligations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  framework_id    UUID REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id),
  obligation_ref  TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  obligation_type TEXT NOT NULL DEFAULT 'regulatory',
  frequency       TEXT,
  due_date        DATE,
  owner_id        UUID,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','met','overdue','waived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- [auto-backfill] idempotent ADD COLUMN for 027-stub drift on __TENANT_SCHEMA__.compliance_obligations
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES __TENANT_SCHEMA__.compliance_frameworks(id);
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS obligation_ref TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS obligation_type TEXT NOT NULL DEFAULT 'regulatory';
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','met','overdue','waived'));
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE __TENANT_SCHEMA__.compliance_obligations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_tenant ON __TENANT_SCHEMA__.compliance_assessments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_assessment ON __TENANT_SCHEMA__.compliance_gaps(assessment_id, gap_status);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_owner ON __TENANT_SCHEMA__.compliance_gaps(owner_id);
