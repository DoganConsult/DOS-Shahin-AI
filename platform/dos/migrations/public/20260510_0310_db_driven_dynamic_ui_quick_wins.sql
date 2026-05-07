-- 20260510_0310_db_driven_dynamic_ui_quick_wins.sql
--
-- DB-driven Dynamic UI quick wins (plan: template/component inventory).
--   1) shell.tpl.dph.* i18n for DynamicPageHost empty surface (DB-only copy).
--   2) Non-destructive route_metadata backfill: every ui_route_template_binding
--      route missing from dynamic_ui_route_metadata, except /workspace-home
--      (shell-only — never insert/overwrite via this sweep). ON CONFLICT DO NOTHING.
--   3) Optional min-seed: foundation DynamicPageHost signature widgets
--      (global tenant_id NULL) per widget-key-map + foundation routes.
--
-- Forward-only. Idempotent. Does not alter 20260510_0300 assertion block
-- (shell.tpl remains 12 rows).

BEGIN;

-- ─── 1) DynamicPageHost template strings (publisher catalog) ─────────
SET LOCAL dos.publisher_session = 'contract-publisher@v1';

INSERT INTO dos.workspace_shell_i18n (ns, key, locale, value, module_code) VALUES
  ('shell.tpl.dph', 'shell.tpl.dph.empty.title', 'en', 'No widgets to display', 'workspace-shell'),
  ('shell.tpl.dph', 'shell.tpl.dph.empty.title', 'ar', 'لا توجد عناصر لعرضها', 'workspace-shell'),
  ('shell.tpl.dph', 'shell.tpl.dph.empty.body',  'en', 'Content appears when widgets are assigned to this route in your workspace.', 'workspace-shell'),
  ('shell.tpl.dph', 'shell.tpl.dph.empty.body',  'ar', 'يظهر المحتوى عند ربط عناصر العرض بهذا المسار في مساحة العمل.', 'workspace-shell')
ON CONFLICT (key, locale) DO UPDATE
  SET value     = EXCLUDED.value,
      ns        = EXCLUDED.ns,
      module_code = EXCLUDED.module_code;

-- ─── 2) Route metadata gap fill (bindings → metadata), preserve shell-home ─
INSERT INTO dos.dynamic_ui_route_metadata (
  route,
  render_mode,
  template_binding_required,
  is_public,
  metadata_public,
  metadata,
  notes
)
SELECT
  b.route,
  'template',
  true,
  false,
  false,
  jsonb_build_object(
    'renderMode', 'template',
    'templateBindingRequired', true,
    'protectedRoute', true
  ),
  format(
    'Auto backfill from ui_route_template_binding (%s → %s). Idempotent DO NOTHING on conflict.',
    b.archetype,
    b.template_export
  )
  FROM dos.ui_route_template_binding b
 WHERE b.route IS NOT NULL
   AND trim(b.route) <> ''
   AND b.route <> '/workspace-home'
   AND NOT EXISTS (
         SELECT 1 FROM dos.dynamic_ui_route_metadata m WHERE m.route = b.route
       )
ON CONFLICT (route) DO NOTHING;

-- ─── 3) Foundation signature widget min-seeds (global scope) ───────────
INSERT INTO dos.dynamic_ui_widgets (
  tenant_id,
  module_code,
  route,
  widget_key,
  zone,
  permission,
  profiles,
  config,
  sort_order,
  is_signature,
  is_active
)
SELECT NULL,
       'foundation',
       v.route,
       v.widget_key,
       'signature',
       NULL,
       NULL,
       '{}'::jsonb,
       0,
       true,
       true
  FROM (VALUES
    ('/foundation/organization',           'org-graph-canvas'),
    ('/foundation/departments',            'departments-grid'),
    ('/foundation/business-units',         'business-units-grid'),
    ('/foundation/teams',                  'raci-canvas'),
    ('/foundation/roles',                   'foundation-roles-list'),
    ('/foundation/positions',               'positions-board'),
    ('/foundation/users',                   'identity-360-list'),
    ('/foundation/committees',              'decision-room'),
    ('/foundation/delegations',             'authority-simulator'),
    ('/foundation/locations',               'geo-coverage-map'),
    ('/foundation/policies',                'foundation-policies-list'),
    ('/foundation/reference-data',          'taxonomy-editor'),
    ('/foundation/data-processing',         'ropa-map'),
    ('/foundation/ownership-mapping',       'ownership-heatmap'),
    ('/foundation/access-review',           'campaign-cockpit'),
    ('/foundation/audit',                   'forensic-timeline'),
    ('/foundation/operations-readiness',    'foundation-operations-readiness'),
    ('/foundation/people/onboarding',       'foundation-onboarding-kanban'),
    ('/foundation/people/lifecycle',        'foundation-lifecycle-timeline'),
    ('/foundation/people/probation-due',    'foundation-probation-queue'),
    ('/foundation/governance/authority-matrix','foundation-authority-matrix'),
    ('/foundation/governance/sod-rules',    'foundation-sod-rules'),
    ('/foundation/governance/sod-violations','foundation-sod-violations'),
    ('/foundation/governance/policy-acks',  'foundation-policy-acks'),
    ('/foundation/governance/training',     'foundation-training-board'),
    ('/foundation/governance/coi',          'foundation-coi-declarations'),
    ('/foundation/settings',                'tenant-control-center'),
    ('/foundation/permissions',             'permission-matrix')
  ) AS v(route, widget_key)
 WHERE NOT EXISTS (
         SELECT 1
           FROM dos.dynamic_ui_widgets w
          WHERE w.module_code = 'foundation'
            AND w.route = v.route
            AND w.widget_key = v.widget_key
            AND w.tenant_id IS NULL
       );

-- ─── 4) Soft check — shell.tpl.dph catalog present ─────────────────────
DO $$
DECLARE
  c_dph INT;
BEGIN
  SELECT COUNT(*) INTO c_dph
    FROM dos.workspace_shell_i18n
   WHERE ns = 'shell.tpl.dph'
     AND key IN ('shell.tpl.dph.empty.title', 'shell.tpl.dph.empty.body');
  IF c_dph < 4 THEN
    RAISE WARNING 'shell.tpl.dph i18n incomplete: % rows (expected 4)', c_dph;
  END IF;
END $$;

COMMIT;
