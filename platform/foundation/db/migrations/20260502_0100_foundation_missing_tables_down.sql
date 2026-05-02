-- =====================================================================
-- Foundation missing tables — rollback (20260502_0100)
-- =====================================================================

BEGIN;

SET search_path = public;

DROP TABLE IF EXISTS dos.module_sla_defaults CASCADE;
DROP TABLE IF EXISTS dos.role_assignments CASCADE;
DROP TABLE IF EXISTS dos.user_role_assignments CASCADE;
DROP TABLE IF EXISTS dos.user_roles CASCADE;
DROP TABLE IF EXISTS dos.committee_meetings CASCADE;
DROP TABLE IF EXISTS dos.access_review_items CASCADE;
DROP TABLE IF EXISTS dos.access_reviews CASCADE;

COMMIT;
