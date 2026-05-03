-- =====================================================================
-- 0140 DOWN — re-insert the 5 PARTIAL nav rows the up migration dropped.
-- Mirrors the orphan-backfill behaviour of 0110 for the 5 duplicates.
-- =====================================================================
BEGIN;

INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  (NULL, 'foundation', 'Overview',  '/foundation/overview',  8,  NULL, 'PARTIAL'),
  (NULL, 'foundation', 'Records',   '/foundation/records',   13, NULL, 'PARTIAL'),
  (NULL, 'foundation', 'Workflows', '/foundation/workflows', 20, NULL, 'PARTIAL'),
  (NULL, 'foundation', 'Reports',   '/foundation/reports',   15, NULL, 'PARTIAL'),
  (NULL, 'foundation', 'Settings',  '/foundation/settings',  18, NULL, 'PARTIAL')
ON CONFLICT DO NOTHING;

COMMIT;
