-- Foundation: SoD exception + review tables (Wave 1 backend completion).
--
-- Adds the missing live tables for SoD lifecycle so the foundation HTTP
-- routers /api/foundation/sod/exceptions and /api/foundation/sod/reviews
-- can be served from real DB rows instead of being seeded only via the
-- contract layer.
--
-- Tables (all dos.* with TEXT tenant_id, RLS enforced):
--   dos.foundation_sod_exception
--     One open record per (tenant, user, rule). Captures the business
--     justification for an accepted SoD violation along with the
--     compensating control and time-bound expiry.
--   dos.foundation_sod_review_cycle
--     A periodic SoD attestation campaign (quarterly / annual). Each
--     cycle freezes the population of rules + violations to be attested.
--   dos.foundation_sod_review_attestation
--     One attestation record per (cycle, user, rule). Reviewer decision
--     and rationale, audit trail for SAMA / SOX evidence.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── foundation_sod_exception ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_sod_exception (
  exception_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT NOT NULL,
  rule_code        TEXT NOT NULL,
  user_id          TEXT NOT NULL,
  -- The conflict the exception accepts. Mirrors the SoD violation context
  -- so the exception can be matched 1-to-1 to the open violation record.
  context          JSONB NOT NULL DEFAULT '{}'::jsonb,
  business_reason  TEXT NOT NULL,
  compensating_control TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected','expired','revoked')),
  approved_by      TEXT,
  approved_at      TIMESTAMPTZ,
  rejected_reason  TEXT,
  effective_from   TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to     TIMESTAMPTZ,
  created_by       TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_foundation_sod_exception_tenant
  ON dos.foundation_sod_exception (tenant_id, status, effective_to);
CREATE INDEX IF NOT EXISTS ix_foundation_sod_exception_user
  ON dos.foundation_sod_exception (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS ix_foundation_sod_exception_rule
  ON dos.foundation_sod_exception (tenant_id, rule_code);

ALTER TABLE dos.foundation_sod_exception ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_sod_exception FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_sod_exception;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_sod_exception;
CREATE POLICY foundation_tenant_read ON dos.foundation_sod_exception FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );
CREATE POLICY foundation_tenant_write ON dos.foundation_sod_exception FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );

-- ─── foundation_sod_review_cycle ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_sod_review_cycle (
  cycle_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  cycle_code      TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  cadence         TEXT NOT NULL DEFAULT 'quarterly'
                    CHECK (cadence IN ('monthly','quarterly','annual','adhoc')),
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at          TIMESTAMPTZ NOT NULL,
  closed_at       TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('draft','open','in_review','closed','cancelled')),
  scope           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_foundation_sod_review_cycle UNIQUE (tenant_id, cycle_code)
);

CREATE INDEX IF NOT EXISTS ix_foundation_sod_review_cycle_open
  ON dos.foundation_sod_review_cycle (tenant_id, status, due_at);

ALTER TABLE dos.foundation_sod_review_cycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_sod_review_cycle FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_sod_review_cycle;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_sod_review_cycle;
CREATE POLICY foundation_tenant_read ON dos.foundation_sod_review_cycle FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );
CREATE POLICY foundation_tenant_write ON dos.foundation_sod_review_cycle FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );

-- ─── foundation_sod_review_attestation ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.foundation_sod_review_attestation (
  attestation_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  cycle_id        UUID NOT NULL REFERENCES dos.foundation_sod_review_cycle(cycle_id) ON DELETE CASCADE,
  rule_code       TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  reviewer_id     TEXT,
  decision        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (decision IN ('pending','accept_risk','remediate','revoke','escalate','no_change')),
  rationale       TEXT,
  evidence_uri    TEXT,
  decided_at      TIMESTAMPTZ,
  context         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_foundation_sod_review_attestation UNIQUE (cycle_id, rule_code, user_id)
);

CREATE INDEX IF NOT EXISTS ix_foundation_sod_review_attestation_cycle
  ON dos.foundation_sod_review_attestation (tenant_id, cycle_id);
CREATE INDEX IF NOT EXISTS ix_foundation_sod_review_attestation_pending
  ON dos.foundation_sod_review_attestation (tenant_id, decision)
  WHERE decision = 'pending';

ALTER TABLE dos.foundation_sod_review_attestation ENABLE ROW LEVEL SECURITY;
ALTER TABLE dos.foundation_sod_review_attestation FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS foundation_tenant_read  ON dos.foundation_sod_review_attestation;
DROP POLICY IF EXISTS foundation_tenant_write ON dos.foundation_sod_review_attestation;
CREATE POLICY foundation_tenant_read ON dos.foundation_sod_review_attestation FOR SELECT
  USING ( current_setting('app.current_tenant_id', true) IS NULL
       OR current_setting('app.current_tenant_id', true) = ''
       OR tenant_id::text = current_setting('app.current_tenant_id', true) );
CREATE POLICY foundation_tenant_write ON dos.foundation_sod_review_attestation FOR ALL
  USING      ( tenant_id::text = current_setting('app.current_tenant_id', true) )
  WITH CHECK ( tenant_id::text = current_setting('app.current_tenant_id', true) );

-- ─── Runtime grants ────────────────────────────────────────────────────────
DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.foundation_sod_exception            TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.foundation_sod_review_cycle         TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.foundation_sod_review_attestation   TO dos_auth';
  END IF;
END
$grants$;

-- ─── Validation assertion ──────────────────────────────────────────────────
DO $verify$
DECLARE
  has_exception   BOOLEAN;
  has_cycle       BOOLEAN;
  has_attestation BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='dos' AND table_name='foundation_sod_exception')          INTO has_exception;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='dos' AND table_name='foundation_sod_review_cycle')       INTO has_cycle;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='dos' AND table_name='foundation_sod_review_attestation') INTO has_attestation;
  IF NOT (has_exception AND has_cycle AND has_attestation) THEN
    RAISE EXCEPTION 'foundation_sod_exception/review tables not created (exception=% cycle=% attestation=%)',
      has_exception, has_cycle, has_attestation;
  END IF;
END
$verify$;

COMMIT;
