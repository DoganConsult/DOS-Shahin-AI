BEGIN;
-- Rollback for 001_workflow_tables.sql

-- Drop tables in reverse order
DROP TABLE IF EXISTS public.approval_steps_log CASCADE;
DROP TABLE IF EXISTS public.approval_requests CASCADE;
DROP TABLE IF EXISTS public.approval_chains CASCADE;
DROP TABLE IF EXISTS dos.job_executions CASCADE;
DROP TABLE IF EXISTS dos.job_registry CASCADE;
DROP TABLE IF EXISTS dos.workflow_approvals CASCADE;
DROP TABLE IF EXISTS dos.workflow_templates CASCADE;

COMMIT;
