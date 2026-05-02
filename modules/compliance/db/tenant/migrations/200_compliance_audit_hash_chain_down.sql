-- Wave 10 rollback: drop hash-chain columns from compliance_audit_trail.
-- WARNING: this loses the integrity proof. Only run during DR / known-good
-- rollback. Existing audit entries (the row data) are NOT deleted.

DROP INDEX IF EXISTS "__TENANT_SCHEMA__".idx_compliance_audit_trail_entry_hash;
DROP INDEX IF EXISTS "__TENANT_SCHEMA__".idx_compliance_audit_trail_chain_seq;

ALTER TABLE "__TENANT_SCHEMA__"."compliance_audit_trail"
  DROP COLUMN IF EXISTS chain_seq,
  DROP COLUMN IF EXISTS entry_hash,
  DROP COLUMN IF EXISTS prev_hash;
