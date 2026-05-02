-- Generated from grc-profile/manifests/regulatory.profile.json
-- Wave 5: per-module canonical schema. Additive (no destructive ops).
-- Tenant isolation: search_path is set per-request; tables use tenant_id + RLS.
-- Roll-forward only; rollback handled by migration-runner if requested.

BEGIN;

-- =========================================================================
-- Primary record table
-- =========================================================================
CREATE TABLE IF NOT EXISTS regulatory_record (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  code            TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  state           TEXT NOT NULL DEFAULT 'create'
                  CHECK (state IN ('create','classify','assign_owner','raci_map',
                                   'risk_compliance_link','workflow_approval',
                                   'evidence_attach','monitor','exception_or_issue',
                                   'remediate','retest_review','close','archive')),
  scope_level     TEXT NOT NULL DEFAULT 'org'
                  CHECK (scope_level IN ('org','business_unit','department','team','position','own')),
  scope_id        UUID,
  owner_user_id   UUID,
  accountable_user_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID,
  closed_at       TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT regulatory_record_tenant_code_uniq UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS regulatory_record_tenant_state_idx ON regulatory_record (tenant_id, state);
CREATE INDEX IF NOT EXISTS regulatory_record_owner_idx        ON regulatory_record (owner_user_id);

-- =========================================================================
-- RACI mapping (per record)
-- =========================================================================
CREATE TABLE IF NOT EXISTS regulatory_raci (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  record_id       UUID NOT NULL REFERENCES regulatory_record(id) ON DELETE CASCADE,
  role_code       TEXT NOT NULL,           -- e.g. 'responsible','accountable','consulted','informed'
  user_id         UUID,
  position_id     UUID,
  team_id         UUID,
  department_id   UUID,
  business_unit_id UUID,
  organization_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT regulatory_raci_role_chk CHECK (role_code IN ('responsible','accountable','consulted','informed'))
);
CREATE INDEX IF NOT EXISTS regulatory_raci_record_idx ON regulatory_raci (record_id);

-- =========================================================================
-- Workflow state log (per hook execution)
-- =========================================================================
CREATE TABLE IF NOT EXISTS regulatory_workflow_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  record_id       UUID NOT NULL REFERENCES regulatory_record(id) ON DELETE CASCADE,
  hook            TEXT NOT NULL,           -- intake_review | owner_acknowledge | post_approval | deviation_triage | retest_review
  state_from      TEXT,
  state_to        TEXT NOT NULL,
  trigger         TEXT NOT NULL,
  actor_user_id   UUID,
  actor_role      TEXT,
  sla_due_at      TIMESTAMPTZ,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  comment         TEXT,
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS regulatory_workflow_log_record_idx ON regulatory_workflow_log (record_id, decided_at);

-- =========================================================================
-- Evidence attachments
-- =========================================================================
CREATE TABLE IF NOT EXISTS regulatory_evidence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  record_id       UUID NOT NULL REFERENCES regulatory_record(id) ON DELETE CASCADE,
  evidence_type   TEXT NOT NULL,
  storage_uri     TEXT NOT NULL,
  hash_sha256     TEXT,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by    UUID,
  expires_at      TIMESTAMPTZ,
  required        BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS regulatory_evidence_record_idx ON regulatory_evidence (record_id);
CREATE INDEX IF NOT EXISTS regulatory_evidence_expiry_idx ON regulatory_evidence (expires_at) WHERE expires_at IS NOT NULL;

-- =========================================================================
-- Audit trail (mirrored into platform audit_event_ledger via outbox)
-- =========================================================================
CREATE TABLE IF NOT EXISTS regulatory_audit (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  record_id       UUID,
  event           TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('create','update','approve','delete','export','access','configure')),
  actor_user_id   UUID,
  actor_role      TEXT,
  fields_logged   JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS regulatory_audit_record_idx ON regulatory_audit (record_id, occurred_at);
CREATE INDEX IF NOT EXISTS regulatory_audit_event_idx  ON regulatory_audit (event, occurred_at);

-- =========================================================================
-- Reporting cache (KPI/KRI snapshot)
-- =========================================================================
CREATE TABLE IF NOT EXISTS regulatory_kpi_snapshot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  scope_level     TEXT NOT NULL,
  scope_id        UUID,
  kpi_code        TEXT NOT NULL,
  kpi_value       NUMERIC,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS regulatory_kpi_lookup_idx ON regulatory_kpi_snapshot (tenant_id, kpi_code, captured_at);

-- =========================================================================
-- Row-level security (tenant isolation)
-- =========================================================================
ALTER TABLE regulatory_record         ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_raci           ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_workflow_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_evidence       ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_audit          ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_kpi_snapshot   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'regulatory_record_tenant_isolation') THEN
    CREATE POLICY regulatory_record_tenant_isolation        ON regulatory_record         USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY regulatory_raci_tenant_isolation          ON regulatory_raci           USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY regulatory_workflow_log_tenant_isolation  ON regulatory_workflow_log   USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY regulatory_evidence_tenant_isolation      ON regulatory_evidence       USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY regulatory_audit_tenant_isolation         ON regulatory_audit          USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY regulatory_kpi_snapshot_tenant_isolation  ON regulatory_kpi_snapshot   USING (tenant_id::text = current_setting('app.tenant_id', true));
  END IF;
END$$;

COMMIT;
