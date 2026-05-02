-- Rollback for 001_evidence_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_evidence_links_entity;
DROP INDEX IF EXISTS idx_evidence_items_entity;
DROP INDEX IF EXISTS idx_evidence_items_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.evidence_links CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.evidence_requests CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.evidence_items CASCADE;
