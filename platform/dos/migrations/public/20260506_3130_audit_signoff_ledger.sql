-- =============================================================================
-- Migration: 20260506_3130_audit_signoff_ledger
-- Purpose:   Wave F5 — install dos.audit_signoff_ledger to back the
--            always-on Audit Shelf module. Captures every regulator
--            handover bundle: who exported, when, hash of payload, and
--            optional tenant-admin counter-signature.
--
-- Idempotent: YES.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.audit_signoff_ledger (
  bundle_id        bigserial   PRIMARY KEY,
  tenant_id        varchar(64) NOT NULL,
  generated_at     timestamptz NOT NULL DEFAULT now(),
  generated_by     varchar(128) NOT NULL,
  bundle_hash      varchar(96) NOT NULL,
  bundle_path      text,
  section_counts   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  signed_by        varchar(128),
  signed_at        timestamptz,
  signature_hash   varchar(96),
  notes            text
);

CREATE INDEX IF NOT EXISTS ix_audit_signoff_tenant_time
  ON dos.audit_signoff_ledger (tenant_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_signoff_unsigned
  ON dos.audit_signoff_ledger (tenant_id)
  WHERE signed_at IS NULL;

COMMENT ON TABLE dos.audit_signoff_ledger IS
'Append-only ledger of audit-shelf bundle exports and counter-signatures.
Every row is one regulator-handover deliverable.';

-- Acceptor registration (audit-shelf is a pull-only consumer of role-profile
-- and other tenant state).
INSERT INTO dos.role_profile_acceptors (acceptor_id, display_name, direction, enabled)
VALUES ('platform.audit-shelf', 'Platform Audit Shelf', 'pull', true)
ON CONFLICT (acceptor_id) DO NOTHING;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.tables
   WHERE table_schema='dos' AND table_name='audit_signoff_ledger';
  IF n < 1 THEN RAISE EXCEPTION 'audit_signoff_ledger not installed'; END IF;
END $$;

COMMIT;
