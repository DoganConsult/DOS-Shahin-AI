-- Rollback for 001_asset_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_assets_type;
DROP INDEX IF EXISTS idx_assets_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.asset_risk_links CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.assets CASCADE;
