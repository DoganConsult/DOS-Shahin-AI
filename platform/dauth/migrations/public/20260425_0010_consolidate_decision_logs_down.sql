-- Rollback for 20260425_0010_consolidate_decision_logs.sql
-- Drops only the legacy-name compatibility views and the source column;
-- preserves the canonical authz_decision_log table and its data.

DROP VIEW IF EXISTS "__TENANT_SCHEMA__".authorization_decision_log;
DROP VIEW IF EXISTS "__TENANT_SCHEMA__".guard_decision_log;
DROP VIEW IF EXISTS "__TENANT_SCHEMA__".policy_decision_log;

DROP INDEX IF EXISTS "__TENANT_SCHEMA__".idx_authz_decision_log_source;

ALTER TABLE IF EXISTS "__TENANT_SCHEMA__".authz_decision_log
  DROP COLUMN IF EXISTS source;
