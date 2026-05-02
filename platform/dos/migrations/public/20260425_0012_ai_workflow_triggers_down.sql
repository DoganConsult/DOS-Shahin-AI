-- Rollback for 20260425_0012_ai_workflow_triggers.sql
BEGIN;
DROP TABLE IF EXISTS dos.ai_workflow_trigger_log CASCADE;
DROP TABLE IF EXISTS dos.ai_workflow_triggers CASCADE;
COMMIT;
