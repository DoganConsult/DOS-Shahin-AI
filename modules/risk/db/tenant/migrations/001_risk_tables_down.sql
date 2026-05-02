-- Rollback for 001_risk_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_risk_kris_risk;
DROP INDEX IF EXISTS idx_risk_treatments_risk;
DROP INDEX IF EXISTS idx_risks_owner;
DROP INDEX IF EXISTS idx_risks_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_appetite_statements CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_kris CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_assessments CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_treatments CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risk_register CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.risks CASCADE;
