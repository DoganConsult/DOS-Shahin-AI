BEGIN;
-- Rollback for 002_expand_authz_decision_log.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_authz_decision_log_path;
DROP INDEX IF EXISTS idx_authz_decision_log_session;
DROP INDEX IF EXISTS idx_authz_decision_log_ip;

COMMIT;
