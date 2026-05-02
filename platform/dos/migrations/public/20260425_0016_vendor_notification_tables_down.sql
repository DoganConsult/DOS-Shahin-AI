-- Rollback for 20260425_0016_vendor_notification_tables.sql
BEGIN;
DROP TABLE IF EXISTS dos.notifications CASCADE;
DROP TABLE IF EXISTS dos.vendor_engagement_scores CASCADE;
COMMIT;
