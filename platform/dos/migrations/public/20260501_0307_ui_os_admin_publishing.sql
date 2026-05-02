-- =====================================================================
-- UI-OS admin draft/publish/rollback (20260501_0307)
--
-- DEPRECATED — Wave 9 skeleton. The 4 tables originally declared here
-- (ui_draft_versions, ui_published_versions, ui_rollback_points,
-- ui_admin_activity_log) are now CANONICALLY owned by Wave 11l §16:
--
--   20260502_0123_governance_publish.sql       → ui_published_versions
--   20260502_0124_governance_drafts_audit.sql  → ui_draft_versions,
--                                                ui_rollback_points,
--                                                ui_admin_activity_log
--
-- The Wave 11l versions are DKNF-compliant (use dos.ui_target_kind_t
-- ENUM rather than bare TEXT), and the §16 manager + routes are wired
-- against that schema. Keeping duplicate CREATE TABLE blocks here
-- caused silent drift on fresh deployments because IF NOT EXISTS made
-- whichever migration ran first the winner.
--
-- Per the one-source decree: this migration is now a no-op marker.
-- Drift reconciliation for already-deployed legacy tables is handled
-- by 20260502_0131_drift_reconcile_admin_publishing.sql.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

COMMIT;
