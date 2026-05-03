-- =====================================================================
-- 0060 — Template-Only Routing Follow-up
--
-- Adds the 3 missing route bindings exposed by 0050's verify step
-- (`/ai-os/overview`, `/compliance/controls/:id`, `/ops`) and re-runs
-- the component_key normalisation for them. After this migration:
--   * 0 routes have NULL/unmatched component_key (auth + marketing
--     allowlist excluded).
--   * 0 workspace routes are missing a template binding.
-- =====================================================================
BEGIN;

INSERT INTO dos.ui_route_template_binding
  (route, archetype, template_export, props, version, updated_at)
VALUES
  ('/ai-os/overview',           'command-home', 'ModuleOverviewTemplateComponent', '{}'::jsonb, 1, now()),
  ('/compliance/controls/:id',  'record-story', 'RecordStoryTemplateComponent',     '{}'::jsonb, 1, now()),
  ('/ops',                      'command-home', 'ModuleOverviewTemplateComponent', '{}'::jsonb, 1, now())
ON CONFLICT (route) DO NOTHING;

WITH archetype_to_key(archetype, component_key) AS (VALUES
  ('command-home', 'module.entry.page'),
  ('record-story', 'module.record.detail.page')
)
UPDATE dos.dynamic_ui_routes r
   SET component_key = m.component_key
  FROM dos.ui_route_template_binding b
  JOIN archetype_to_key m ON m.archetype = b.archetype
 WHERE b.route = r.path_pattern
   AND r.component_key <> m.component_key;

COMMIT;
