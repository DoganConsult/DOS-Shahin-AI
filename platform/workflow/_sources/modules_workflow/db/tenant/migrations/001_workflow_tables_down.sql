-- Rollback for 001_workflow_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_workflow_escalations_tenant;
DROP INDEX IF EXISTS idx_workflow_event_log_instance;
DROP INDEX IF EXISTS idx_workflow_approvals_instance;
DROP INDEX IF EXISTS idx_workflow_steps_instance;
DROP INDEX IF EXISTS idx_workflow_instances_entity;
DROP INDEX IF EXISTS idx_workflow_instances_status;
DROP INDEX IF EXISTS idx_workflow_instances_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_kill_switches CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_ai_notes CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_chains CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_event_log CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_escalations CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_sla_configs CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_approvals CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_template_library CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_templates CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_transitions CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_steps CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflow_instances CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.workflows CASCADE;
