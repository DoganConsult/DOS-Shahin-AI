-- Rollback for 20260425_0010_governance_core_tables.sql
BEGIN;
DROP TABLE IF EXISTS dos.governance_os_config CASCADE;
DROP TABLE IF EXISTS dos.governance_context CASCADE;
DROP TABLE IF EXISTS dos.governance_initiatives CASCADE;
COMMIT;
