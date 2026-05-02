-- Rollback for 001_vendor_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_vendor_logs_vendor;
DROP INDEX IF EXISTS idx_vendor_dd_vendor;
DROP INDEX IF EXISTS idx_vendor_eng_vendor;
DROP INDEX IF EXISTS idx_vendor_profiles_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.vendor_lifecycle_logs CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.vendor_sla_metrics CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.vendor_due_diligence CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.vendor_engagements CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.vendor_profiles CASCADE;
