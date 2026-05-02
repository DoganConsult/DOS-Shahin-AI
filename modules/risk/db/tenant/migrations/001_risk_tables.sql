-- Module: risk | Migration: 001
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  risk_ref        TEXT GENERATED ALWAYS AS ('RSK-' || LPAD(EXTRACT(EPOCH FROM created_at)::BIGINT::TEXT, 10, '0')) STORED,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,
  sub_category    TEXT,
  status          TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified','assessed','treated','accepted','closed','escalated')),
  likelihood      INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact          INTEGER CHECK (impact BETWEEN 1 AND 5),
  inherent_score  NUMERIC(5,2) GENERATED ALWAYS AS (likelihood * impact) STORED,
  residual_score  NUMERIC(5,2),
  risk_appetite   TEXT CHECK (risk_appetite IN ('low','medium','high','critical')),
  owner_id        UUID,
  entity_type     TEXT,
  entity_id       UUID,
  due_date        DATE,
  review_date     DATE,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_register (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  risk_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  register_type   TEXT NOT NULL DEFAULT 'operational',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_treatments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  risk_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  treatment_type  TEXT NOT NULL CHECK (treatment_type IN ('mitigate','accept','transfer','avoid')),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','failed')),
  assigned_to     UUID,
  due_date        DATE,
  cost_estimate   NUMERIC(15,2),
  effectiveness   INTEGER CHECK (effectiveness BETWEEN 1 AND 5),
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  risk_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  assessed_by     UUID NOT NULL,
  assessment_type TEXT NOT NULL DEFAULT 'periodic',
  likelihood      INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact          INTEGER CHECK (impact BETWEEN 1 AND 5),
  notes           TEXT,
  methodology     TEXT,
  next_review_date DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_kris (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  risk_id         UUID NOT NULL REFERENCES __TENANT_SCHEMA__.risks(id) ON DELETE CASCADE,
  kri_code        TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  current_value   NUMERIC,
  threshold_amber NUMERIC,
  threshold_red   NUMERIC,
  unit            TEXT,
  frequency       TEXT NOT NULL DEFAULT 'monthly',
  status          TEXT NOT NULL DEFAULT 'green' CHECK (status IN ('green','amber','red')),
  last_collected  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS __TENANT_SCHEMA__.risk_appetite_statements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  category        TEXT NOT NULL,
  appetite_level  TEXT NOT NULL CHECK (appetite_level IN ('zero','low','medium','high')),
  statement       TEXT NOT NULL,
  owner_id        UUID,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  valid_from      DATE,
  valid_to        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risks_tenant ON __TENANT_SCHEMA__.risks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_risks_owner ON __TENANT_SCHEMA__.risks(owner_id);
CREATE INDEX IF NOT EXISTS idx_risk_treatments_risk ON __TENANT_SCHEMA__.risk_treatments(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_kris_risk ON __TENANT_SCHEMA__.risk_kris(risk_id, status);
