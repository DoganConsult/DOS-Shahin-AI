BEGIN;
-- Rollback for 001_inbox_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_inbox_user;

-- Drop tables in reverse order
DROP TABLE IF EXISTS dos.notification_inbox CASCADE;

COMMIT;
