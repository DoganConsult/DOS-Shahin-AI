-- Phase M2 — Public marketing pages (pricing, trust, security, contact, about, legal).
-- Owner: ui-os-service.
--
-- Six unauthenticated, tenantless landing surfaces composed exclusively of
-- IBM Carbon `tiles` and `button` primitives. Each component_key resolves
-- through platform/dos/registry/component-map.ts to a standalone Angular
-- component re-exported from @dos/ui-system. No AccessStore, no
-- permission_key, no tenant entitlement.
--
-- Forward-only and idempotent.

BEGIN;

-- ① Component registry rows (vendor='ibm-carbon', approved).
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('marketing.pricing.page',  'ibm-carbon', 'tiles', 'approved'),
  ('marketing.trust.page',    'ibm-carbon', 'tiles', 'approved'),
  ('marketing.security.page', 'ibm-carbon', 'tiles', 'approved'),
  ('marketing.contact.page',  'ibm-carbon', 'tiles', 'approved'),
  ('marketing.about.page',    'ibm-carbon', 'tiles', 'approved'),
  ('marketing.legal.page',    'ibm-carbon', 'tiles', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- ② Public routes (tenant_id IS NULL, no permission_key, no data scope).
DO $$
DECLARE
  rows TEXT[][] := ARRAY[
    ARRAY['/pricing',        'marketing.pricing.page',  '20'],
    ARRAY['/trust',          'marketing.trust.page',    '21'],
    ARRAY['/security',       'marketing.security.page', '22'],
    ARRAY['/contact',        'marketing.contact.page',  '23'],
    ARRAY['/about',          'marketing.about.page',    '24'],
    ARRAY['/legal',          'marketing.legal.page',    '25']
  ];
  r TEXT[];
BEGIN
  FOREACH r SLICE 1 IN ARRAY rows
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM dos.dynamic_ui_routes
      WHERE tenant_id IS NULL AND path_pattern = r[1] AND module_code = 'marketing'
    ) THEN
      INSERT INTO dos.dynamic_ui_routes
        (tenant_id, module_code, path_pattern, component_key, permission_key,
         sort_order, readiness, page_type, layout, kpi_scope, user_intent,
         data_scope_mode, evidence_required, title_key, subtitle_key,
         data_resource_key, default_view, audit_enabled, realtime_enabled)
      VALUES
        (NULL, 'marketing', r[1], r[2], NULL,
         r[3]::int, 'active', 'overview', 'full-page', 'none', NULL, NULL,
         FALSE,
         replace(r[2], '.page', '.title'),
         replace(r[2], '.page', '.subtitle'),
         'marketing.resource.public', 'cards',
         FALSE, FALSE);
    END IF;
  END LOOP;
END $$;

-- ③ Template bindings — every public marketing page resolves to the
--    command-home archetype family (full-page composition).
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props)
VALUES
  ('/pricing',  'command-home', 'ModuleOverviewTemplateComponent', '{}'::jsonb),
  ('/trust',    'command-home', 'ModuleOverviewTemplateComponent', '{}'::jsonb),
  ('/security', 'command-home', 'ModuleOverviewTemplateComponent', '{}'::jsonb),
  ('/contact',  'command-home', 'ModuleOverviewTemplateComponent', '{}'::jsonb),
  ('/about',    'command-home', 'ModuleOverviewTemplateComponent', '{}'::jsonb),
  ('/legal',    'command-home', 'ModuleOverviewTemplateComponent', '{}'::jsonb)
ON CONFLICT (route) DO UPDATE
  SET archetype = EXCLUDED.archetype,
      template_export = EXCLUDED.template_export,
      props = COALESCE(dos.ui_route_template_binding.props, '{}'::jsonb) || EXCLUDED.props;

-- ④ Sanity guard.
DO $$
DECLARE cnt INT;
BEGIN
  SELECT count(*) INTO cnt
  FROM dos.dynamic_ui_component_registry
  WHERE component_key IN (
    'marketing.pricing.page','marketing.trust.page','marketing.security.page',
    'marketing.contact.page','marketing.about.page','marketing.legal.page'
  )
    AND vendor = 'ibm-carbon' AND approval_status = 'approved';
  IF cnt <> 6 THEN
    RAISE EXCEPTION '[marketing-public-pages] expected 6 approved registry rows, found %', cnt;
  END IF;

  SELECT count(*) INTO cnt
  FROM dos.dynamic_ui_routes
  WHERE tenant_id IS NULL
    AND path_pattern IN ('/pricing','/trust','/security','/contact','/about','/legal')
    AND readiness = 'active';
  IF cnt <> 6 THEN
    RAISE EXCEPTION '[marketing-public-pages] expected 6 active routes, found %', cnt;
  END IF;
END $$;

COMMIT;
