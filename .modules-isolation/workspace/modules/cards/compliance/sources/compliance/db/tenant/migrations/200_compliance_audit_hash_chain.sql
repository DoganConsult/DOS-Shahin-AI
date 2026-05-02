-- Wave 10 — Tamper-evident audit trail.
--
-- Adds hash-chain columns to compliance_audit_trail. Each new entry's
-- entry_hash = SHA-256(prev_hash || canonical_json(payload)). The first
-- entry per tenant has prev_hash = '0'.repeat(64) (genesis).
--
-- Existing rows (pre-Wave-10) keep prev_hash = NULL / entry_hash = NULL.
-- The hash-chain verifier ignores nulls when computing the chain start
-- and treats the first non-null entry as the chain head.
--
-- Required by SAMA Cybersecurity Framework + KSA NCA ECC for non-repudiation.

ALTER TABLE "__TENANT_SCHEMA__"."compliance_audit_trail"
  ADD COLUMN IF NOT EXISTS prev_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS entry_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS chain_seq BIGINT;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_compliance_audit_trail_chain_seq
    ON "__TENANT_SCHEMA__"."compliance_audit_trail" (tenant_id, chain_seq)
    WHERE chain_seq IS NOT NULL;
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_compliance_audit_trail_entry_hash
    ON "__TENANT_SCHEMA__"."compliance_audit_trail" (entry_hash)
    WHERE entry_hash IS NOT NULL;
EXCEPTION WHEN undefined_column OR insufficient_privilege THEN NULL; END $$;

COMMENT ON COLUMN "__TENANT_SCHEMA__"."compliance_audit_trail".prev_hash IS
  'SHA-256 of the previous chain entry. Genesis = 64 zeros. Wave 10.';
COMMENT ON COLUMN "__TENANT_SCHEMA__"."compliance_audit_trail".entry_hash IS
  'SHA-256(prev_hash || canonical_json(this row excluding entry_hash)). Wave 10.';
COMMENT ON COLUMN "__TENANT_SCHEMA__"."compliance_audit_trail".chain_seq IS
  'Monotonic per-tenant sequence. NULL for pre-Wave-10 entries. Wave 10.';
