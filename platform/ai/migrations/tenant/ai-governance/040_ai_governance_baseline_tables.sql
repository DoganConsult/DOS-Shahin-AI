-- Module: ai-governance | Migration: 040 | Baseline tenant tables
--
-- Authoritative CREATE TABLE for the per-tenant tables consumed by the
-- ai-governance and ai-engine services. Recovers the canonical schema
-- that was previously created out-of-band (so 9 test-DB tenant schemas
-- were missing it). Idempotent CREATE IF NOT EXISTS so re-runs against
-- already-provisioned tenants are no-ops. Doctrine: AGENTS.md
-- "If the schema is missing, migrate it."
--
-- Tables created (per tenant schema):
--   * ai_governance_policies — guardrail policy registry (used by 050)
--   * frameworks            — agent domain data (used by 053/057)
--   * controls              — agent domain data (used by 053/057)
--   * audit_plans           — agent domain data (used by 053)
--   * policies              — agent domain data (used by 053)
--
-- Runs against the active tenant schema (search_path is set by the
-- tenant migration runner before execution).

BEGIN;

-- ─── ai_governance_policies ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_governance_policies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  name              text NOT NULL,
  description       text,
  policy_type       text NOT NULL DEFAULT 'usage',
  scope             text NOT NULL DEFAULT 'platform',
  rules             jsonb NOT NULL DEFAULT '[]'::jsonb,
  enforcement_mode  text NOT NULL DEFAULT 'advisory'
                    CHECK (enforcement_mode IN ('advisory','blocking','logging')),
  version           integer NOT NULL DEFAULT 1,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','deprecated')),
  approved_by       uuid,
  approved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_governance_policies_tenant
  ON ai_governance_policies (tenant_id, policy_type, status);

-- ─── frameworks ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS frameworks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id    text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  category        text DEFAULT 'compliance',
  status          text DEFAULT 'not_started',
  mandatory       boolean DEFAULT false,
  total_controls  integer DEFAULT 0,
  workspace_id    uuid,
  tenant_id       text,
  created_at      timestamptz DEFAULT NOW(),
  updated_at      timestamptz DEFAULT NOW()
);

-- ─── controls ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controls (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id         text NOT NULL UNIQUE,
  title              text NOT NULL,
  description        text,
  frameworks         text[] DEFAULT '{}'::text[],
  domain_name        text,
  status             text DEFAULT 'not_started',
  priority           text DEFAULT 'medium',
  workspace_id       uuid,
  tenant_id          text,
  control_ref        text,
  control_type       text
                     CHECK (control_type IS NULL OR control_type IN ('preventive','detective','corrective','deterrent','compensating')),
  control_family     text,
  effectiveness      text
                     CHECK (effectiveness IS NULL OR effectiveness IN ('effective','partially_effective','ineffective','not_tested')),
  automation_level   text NOT NULL DEFAULT 'manual'
                     CHECK (automation_level IN ('manual','semi_automated','fully_automated')),
  owner_id           uuid,
  frequency          text NOT NULL DEFAULT 'monthly',
  last_tested_at     timestamptz,
  next_review_date   date,
  framework_refs     jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_refs          jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by         uuid,
  created_at         timestamptz DEFAULT NOW(),
  updated_at         timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_controls_tenant ON controls (tenant_id, status);

-- ─── audit_plans ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  plan_year     integer NOT NULL,
  name          text NOT NULL,
  objective     text,
  methodology   text,
  status        text NOT NULL DEFAULT 'draft',
  risk_based    boolean NOT NULL DEFAULT TRUE,
  total_hours   integer,
  approved_by   uuid,
  approved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_plans_tenant ON audit_plans (tenant_id, plan_year, status);

-- ─── policies ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  policy_ref        text NOT NULL,
  title             text NOT NULL,
  description       text,
  policy_type       text NOT NULL DEFAULT 'internal',
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','under_review','approved','active','archived','superseded')),
  version           integer NOT NULL DEFAULT 1,
  category          text,
  owner_id          uuid,
  approver_id       uuid,
  approved_at       timestamptz,
  effective_date    date,
  review_date       date,
  expiry_date       date,
  content           text,
  content_url       text,
  framework_refs    jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags              text[] NOT NULL DEFAULT '{}'::text[],
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies (tenant_id, status);

COMMIT;
