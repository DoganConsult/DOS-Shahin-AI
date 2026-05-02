-- Rollback for 001_notification_tables.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_inbox_items_recipient;
DROP INDEX IF EXISTS idx_notifications_recipient;

-- Drop tables in reverse order
DROP TABLE IF EXISTS __TENANT_SCHEMA__.inbox_items CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.notification_templates CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.notification_preferences CASCADE;
DROP TABLE IF EXISTS __TENANT_SCHEMA__.notifications CASCADE;
