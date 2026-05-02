-- Rollback for 001_audit_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_audit_findings_tenant;
DROP INDEX IF EXISTS idx_audit_trail_actor;
DROP INDEX IF EXISTS idx_audit_trail_entity;
DROP INDEX IF EXISTS idx_audit_trail_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.audit_retention_policies CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.audit_findings CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.audit_trail CASCADE;
