-- Rollback for 001_compliance_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_compliance_gaps_owner;
DROP INDEX IF EXISTS idx_compliance_gaps_assessment;
DROP INDEX IF EXISTS idx_compliance_assessments_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.compliance_obligations CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.compliance_gaps CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.compliance_assessments CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.compliance_requirements CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.compliance_frameworks CASCADE;
