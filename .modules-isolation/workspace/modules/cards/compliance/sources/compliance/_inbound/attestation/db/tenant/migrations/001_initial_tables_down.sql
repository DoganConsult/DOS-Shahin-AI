-- Rollback for 001_initial_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_attestation_logs_entity;
DROP INDEX IF EXISTS idx_attestation_items_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.attestation_logs CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.attestation_items CASCADE;
