BEGIN;
-- Rollback for 001_vendor_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_vendors_status;
DROP INDEX IF EXISTS idx_vendors_tenant;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.vendors CASCADE;

COMMIT;
