-- =====================================================================
-- 0150 DOWN — restore the 2 parameterised nav rows dropped by 0150.
-- Mirrors orphan-backfill semantics of 0110 (PARTIAL readiness, no
-- parent, label='Detail').
-- =====================================================================
BEGIN;

INSERT INTO dos.dynamic_ui_navigation
  (tenant_id, module_code, label, route, sort_order, parent_id, readiness)
VALUES
  (NULL, 'foundation', 'Detail', '/foundation/roles/:id',     99, NULL, 'PARTIAL'),
  (NULL, 'compliance', 'Detail', '/compliance/controls/:id',  99, NULL, 'PARTIAL')
ON CONFLICT DO NOTHING;

COMMIT;
