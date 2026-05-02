-- Rollback for 001_incident_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_incidents_severity;
DROP INDEX IF EXISTS idx_incidents_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.incident_capas CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.incident_timeline CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.incidents CASCADE;
