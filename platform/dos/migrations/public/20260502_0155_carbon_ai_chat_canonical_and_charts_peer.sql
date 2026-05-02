-- =====================================================================
-- 0155 — Realign AI Chat to canonical @carbon/ai-chat + catalog @carbon/charts
--
-- Per Angular-safe install list (2026-05-02): the canonical IBM AI Chat
-- package for Angular runtime (consumed via custom-element wrapper) is
-- `@carbon/ai-chat`, not `@carbon/ai-chat-components`. The latter has been
-- uninstalled; this migration realigns the 3 ai.* catalog rows.
--
-- Also catalogues `@carbon/charts` — the framework-agnostic core engine
-- that `@carbon/charts-angular` depends on (peer/asset). It was installed
-- but never had a catalog row.
--
-- Net new rows: 1
-- Updated rows: 3 (package_name realigned)
-- =====================================================================
BEGIN;

-- 1. Realign 3 ai-chat rows to canonical @carbon/ai-chat package.
UPDATE dos.ui_carbon_components
   SET package_name    = '@carbon/ai-chat',
       package_version = '1.11.0',
       notes           = COALESCE(notes,'') || ' (realigned 0155: package_name → @carbon/ai-chat per Angular-safe install list)'
 WHERE package_name = '@carbon/ai-chat-components';

-- 2. Catalog @carbon/charts as the peer-asset engine row.
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, source_component_name,
   category, is_experimental, is_active,
   integration_mode, runtime_status, angular_native, wrapper_required,
   stability, dynamic_ui_allowed, vendor, notes)
VALUES
  ('asset.charts', '@carbon/charts', '1.27.8', '@carbon/charts',
   'utility', FALSE, TRUE,
   'asset-package', 'active', TRUE, FALSE, 'stable', FALSE, 'ibm-carbon',
   'Framework-agnostic Carbon Charts core engine. Peer of @carbon/charts-angular; do not consume directly — use the 25 chart.* rows + DosCarbonChartComponent.')
ON CONFLICT (carbon_key) DO UPDATE
   SET package_name          = EXCLUDED.package_name,
       package_version       = EXCLUDED.package_version,
       source_component_name = EXCLUDED.source_component_name,
       category              = EXCLUDED.category,
       integration_mode      = EXCLUDED.integration_mode,
       runtime_status        = EXCLUDED.runtime_status,
       angular_native        = EXCLUDED.angular_native,
       wrapper_required      = EXCLUDED.wrapper_required,
       stability             = EXCLUDED.stability,
       dynamic_ui_allowed    = EXCLUDED.dynamic_ui_allowed,
       vendor                = EXCLUDED.vendor,
       notes                 = EXCLUDED.notes,
       is_active             = TRUE;

-- 3. Post-flight invariants.
DO $$
DECLARE
  n_total       INTEGER;
  n_pkgs        INTEGER;
  n_non_ibm     INTEGER;
  n_ai_chat     INTEGER;
  n_old_aichat  INTEGER;
  n_charts_eng  INTEGER;
BEGIN
  SELECT COUNT(*)               INTO n_total       FROM dos.ui_carbon_components;
  SELECT COUNT(DISTINCT package_name) INTO n_pkgs  FROM dos.ui_carbon_components;
  SELECT COUNT(*)               INTO n_non_ibm     FROM dos.ui_carbon_components WHERE vendor <> 'ibm-carbon';
  SELECT COUNT(*)               INTO n_ai_chat     FROM dos.ui_carbon_components WHERE package_name = '@carbon/ai-chat';
  SELECT COUNT(*)               INTO n_old_aichat  FROM dos.ui_carbon_components WHERE package_name = '@carbon/ai-chat-components';
  SELECT COUNT(*)               INTO n_charts_eng  FROM dos.ui_carbon_components WHERE package_name = '@carbon/charts';

  IF n_old_aichat <> 0   THEN RAISE EXCEPTION '0155: legacy @carbon/ai-chat-components rows remain (%)', n_old_aichat; END IF;
  IF n_ai_chat    <  3   THEN RAISE EXCEPTION '0155: @carbon/ai-chat rows below 3 (got %)', n_ai_chat; END IF;
  IF n_charts_eng <> 1   THEN RAISE EXCEPTION '0155: @carbon/charts engine row missing (got %)', n_charts_eng; END IF;
  IF n_non_ibm    <> 0   THEN RAISE EXCEPTION '0155: non-IBM rows present (%)', n_non_ibm; END IF;
  IF n_pkgs       <  20  THEN RAISE EXCEPTION '0155: distinct packages below 20 (got %)', n_pkgs; END IF;

  RAISE NOTICE 'CATALOG ALIGNED: total=% pkgs=% ai_chat=% charts_engine=% non_ibm=%',
    n_total, n_pkgs, n_ai_chat, n_charts_eng, n_non_ibm;
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0155_carbon_ai_chat_canonical_and_charts_peer.sql', 'inline-0155', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0155_carbon_ai_chat_canonical_and_charts_peer.sql'
 );

COMMIT;
