-- =====================================================================
-- 0080 — Foundation missing template bindings.
--
-- ui-registry:verify reported 5 foundation routes without binding rows
-- in dos.ui_route_template_binding (Template-Only Routing rule §3.1).
-- These routes existed in dos.dynamic_ui_routes (registered by Phase
-- F-FOUND pack) but were never bound to a 32-archetype template.
--
-- Effect (idempotent, forward-only): insert one binding per missing
-- route mapped to the closest archetype, and align
-- dos.dynamic_ui_routes.component_key with the canonical archetype
-- component_key (per migration 0050 contract).
-- =====================================================================
BEGIN;

INSERT INTO dos.ui_route_template_binding
  (route, archetype, template_export, props, version, updated_at)
VALUES
  ('/foundation/ownership',      'ownership-map',     'OwnershipMapTemplateComponent',     '{}'::jsonb, 1, now()),
  ('/foundation/sod',            'module-settings',   'ModuleSettingsTemplateComponent',   '{}'::jsonb, 1, now()),
  ('/foundation/hierarchy-viz',  'org-chart',         'OrgChartTemplateComponent',         '{}'::jsonb, 1, now()),
  ('/foundation/user-lifecycle', 'workflow-timeline', 'WorkflowTimelineTemplateComponent', '{}'::jsonb, 1, now()),
  ('/foundation/diagnostics',    'posture-overview',  'PostureOverviewTemplateComponent',  '{}'::jsonb, 1, now())
ON CONFLICT (route) DO UPDATE
  SET archetype       = EXCLUDED.archetype,
      template_export = EXCLUDED.template_export,
      version         = dos.ui_route_template_binding.version + 1,
      updated_at      = now();

-- Re-normalise component_key for the 5 routes against the canonical
-- archetype-to-key map (mirror of ARCHETYPE_REGISTRY).
WITH archetype_to_key(archetype, component_key) AS (VALUES
  ('ownership-map',     'module.ownership_map.page'),
  ('module-settings',   'module.settings.page'),
  ('org-chart',         'module.org_chart.page'),
  ('workflow-timeline', 'module.workflow_timeline.page'),
  ('posture-overview',  'module.posture.page')
)
UPDATE dos.dynamic_ui_routes r
   SET component_key = m.component_key
  FROM dos.ui_route_template_binding b
  JOIN archetype_to_key m ON m.archetype = b.archetype
 WHERE b.route = r.path_pattern
   AND r.path_pattern IN (
     '/foundation/ownership','/foundation/sod','/foundation/hierarchy-viz',
     '/foundation/user-lifecycle','/foundation/diagnostics'
   )
   AND r.component_key <> m.component_key;

COMMIT;
