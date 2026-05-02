-- =====================================================================
-- Phase G T1 — DOWN migration
-- (20260501_0200_phase_g_trial_lifecycle_down)
--
-- Drops Phase G's 5 tables. Cascades remove indexes + triggers.
-- The shared `dos.set_updated_at()` function is left in place because
-- other tables outside this migration may use it.
-- =====================================================================

BEGIN;

DROP TABLE IF EXISTS dos.trial_audit_log              CASCADE;
DROP TABLE IF EXISTS dos.tenant_module_entitlements   CASCADE;
DROP TABLE IF EXISTS dos.tenant_product_entitlements  CASCADE;
DROP TABLE IF EXISTS dos.tenant_subscriptions         CASCADE;
DROP TABLE IF EXISTS dos.tenant_trials                CASCADE;

DELETE FROM dos.schema_migrations
  WHERE filename = '20260501_0200_phase_g_trial_lifecycle.sql';

COMMIT;
