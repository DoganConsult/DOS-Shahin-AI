-- Rollback for 20260425_0011_governance_os_cases_learning.sql
BEGIN;
DROP TABLE IF EXISTS dos.proactive_leadership_milestones CASCADE;
DROP TABLE IF EXISTS dos.leadership_digests CASCADE;
DROP TABLE IF EXISTS dos.module_operating_state CASCADE;
DROP TABLE IF EXISTS dos.governance_os_learning_signals CASCADE;
DROP TABLE IF EXISTS dos.governance_os_learning_metrics CASCADE;
DROP TABLE IF EXISTS dos.governance_os_cases CASCADE;
COMMIT;
