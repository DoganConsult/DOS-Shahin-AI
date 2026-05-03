-- Phase M1 — marketing.home.page component_key + route binding.
-- Owner: ui-os-service.
--
-- Registers the canonical 16-section marketing landing surface in the
-- Dynamic-UI registry so any brand can resolve it through the standard
-- component_key resolution path. The page itself is rendered by
-- DosMarketingHomePageComponent (@dos/ui-system/marketing/marketing-home.page).
--
-- Carbon backing: the landing composes IBM Carbon `tiles` and `button` via
-- data-cds-component attributes on its sections. carbon_key='tiles' picks
-- the canonical wrapper (validated against dos.ui_carbon_components).
--
-- Forward-only and idempotent.

BEGIN;

-- ① Component registry row.
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('marketing.home.page', 'ibm-carbon', 'tiles', 'approved')
ON CONFLICT (component_key) DO NOTHING;

-- ② Register the marketing module (idempotent).
INSERT INTO dos.dynamic_ui_modules
  (module_code, product_key, display_name, default_route, registry_status,
   default_tenant_enrollment_status, platform_key)
VALUES
  ('marketing', 'shahin-ai', 'Marketing', '/', 'active', 'active', 'dos')
ON CONFLICT (module_code) DO NOTHING;

-- ③ Public landing route (tenant_id IS NULL, public surface — data_scope_mode
--    NULL because the public landing has no data scope).
INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, user_intent,
   data_scope_mode, evidence_required, title_key, subtitle_key,
   data_resource_key, default_view, audit_enabled, realtime_enabled)
SELECT NULL, 'marketing', '/', 'marketing.home.page', NULL,
       10, 'active', 'overview', 'full-page', 'none', NULL, NULL,
       FALSE,
       'marketing.home.title', 'marketing.home.subtitle',
       'marketing.resource.home', 'cards',
       FALSE, FALSE
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.tenant_id IS NULL AND r.path_pattern = '/'
      AND r.module_code = 'marketing'
 );

-- ③ Template binding — landing maps to the command-home archetype family.
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export, props)
VALUES ('/', 'command-home', 'ModuleOverviewTemplateComponent', '{}'::jsonb)
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
  WHERE component_key = 'marketing.home.page'
    AND vendor = 'ibm-carbon' AND approval_status = 'approved';
  IF cnt = 0 THEN
    RAISE EXCEPTION '[marketing-home] component_key not registered or not approved';
  END IF;

  SELECT count(*) INTO cnt
  FROM dos.dynamic_ui_routes
  WHERE tenant_id IS NULL AND path_pattern = '/' AND readiness = 'active';
  IF cnt = 0 THEN
    RAISE EXCEPTION '[marketing-home] root marketing route not active';
  END IF;
END $$;

COMMIT;
