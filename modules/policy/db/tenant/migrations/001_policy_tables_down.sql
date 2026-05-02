-- Rollback for 001_policy_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_policy_attestations_user;
DROP INDEX IF EXISTS idx_policies_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.policy_attestations CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.policy_obligations CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.policies CASCADE;
