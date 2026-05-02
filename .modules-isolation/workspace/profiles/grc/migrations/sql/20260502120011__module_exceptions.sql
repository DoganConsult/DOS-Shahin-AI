-- Generated from grc-profile/manifests/exceptions.profile.json
-- Wave 5: per-module canonical schema. Additive (no destructive ops).
-- Tenant isolation: search_path is set per-request; tables use tenant_id + RLS.
-- Roll-forward only; rollback handled by migration-runner if requested.

BEGIN;

-- =========================================================================
-- Primary record table
-- =========================================================================
CREATE TABLE IF NOT EXISTS exceptions_record (
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
  CONSTRAINT exceptions_record_tenant_code_uniq UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS exceptions_record_tenant_state_idx ON exceptions_record (tenant_id, state);
CREATE INDEX IF NOT EXISTS exceptions_record_owner_idx        ON exceptions_record (owner_user_id);

-- =========================================================================
-- RACI mapping (per record)
-- =========================================================================
CREATE TABLE IF NOT EXISTS exceptions_raci (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  record_id       UUID NOT NULL REFERENCES exceptions_record(id) ON DELETE CASCADE,
  role_code       TEXT NOT NULL,           -- e.g. 'responsible','accountable','consulted','informed'
  user_id         UUID,
  position_id     UUID,
  team_id         UUID,
  department_id   UUID,
  business_unit_id UUID,
  organization_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exceptions_raci_role_chk CHECK (role_code IN ('responsible','accountable','consulted','informed'))
);
CREATE INDEX IF NOT EXISTS exceptions_raci_record_idx ON exceptions_raci (record_id);

-- =========================================================================
-- Workflow state log (per hook execution)
-- =========================================================================
CREATE TABLE IF NOT EXISTS exceptions_workflow_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  record_id       UUID NOT NULL REFERENCES exceptions_record(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS exceptions_workflow_log_record_idx ON exceptions_workflow_log (record_id, decided_at);

-- =========================================================================
-- Evidence attachments
-- =========================================================================
CREATE TABLE IF NOT EXISTS exceptions_evidence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  record_id       UUID NOT NULL REFERENCES exceptions_record(id) ON DELETE CASCADE,
  evidence_type   TEXT NOT NULL,
  storage_uri     TEXT NOT NULL,
  hash_sha256     TEXT,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by    UUID,
  expires_at      TIMESTAMPTZ,
  required        BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS exceptions_evidence_record_idx ON exceptions_evidence (record_id);
CREATE INDEX IF NOT EXISTS exceptions_evidence_expiry_idx ON exceptions_evidence (expires_at) WHERE expires_at IS NOT NULL;

-- =========================================================================
-- Audit trail (mirrored into platform audit_event_ledger via outbox)
-- =========================================================================
CREATE TABLE IF NOT EXISTS exceptions_audit (
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
CREATE INDEX IF NOT EXISTS exceptions_audit_record_idx ON exceptions_audit (record_id, occurred_at);
CREATE INDEX IF NOT EXISTS exceptions_audit_event_idx  ON exceptions_audit (event, occurred_at);

-- =========================================================================
-- Reporting cache (KPI/KRI snapshot)
-- =========================================================================
CREATE TABLE IF NOT EXISTS exceptions_kpi_snapshot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  scope_level     TEXT NOT NULL,
  scope_id        UUID,
  kpi_code        TEXT NOT NULL,
  kpi_value       NUMERIC,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exceptions_kpi_lookup_idx ON exceptions_kpi_snapshot (tenant_id, kpi_code, captured_at);

-- =========================================================================
-- Row-level security (tenant isolation)
-- =========================================================================
ALTER TABLE exceptions_record         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions_raci           ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions_workflow_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions_evidence       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions_audit          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions_kpi_snapshot   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exceptions_record_tenant_isolation') THEN
    CREATE POLICY exceptions_record_tenant_isolation        ON exceptions_record         USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY exceptions_raci_tenant_isolation          ON exceptions_raci           USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY exceptions_workflow_log_tenant_isolation  ON exceptions_workflow_log   USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY exceptions_evidence_tenant_isolation      ON exceptions_evidence       USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY exceptions_audit_tenant_isolation         ON exceptions_audit          USING (tenant_id::text = current_setting('app.tenant_id', true));
    CREATE POLICY exceptions_kpi_snapshot_tenant_isolation  ON exceptions_kpi_snapshot   USING (tenant_id::text = current_setting('app.tenant_id', true));
  END IF;
END$$;

COMMIT;
