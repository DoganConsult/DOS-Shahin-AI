-- 20260510_0100_settings_route_metadata_contract.sql
--
-- SETTINGS_ROUTE_METADATA_CONTRACT_FIX — /settings only.
--   * Contract row in dos.dynamic_ui_route_metadata (workspace shell + SPA
--     RouteMetadataService / DynamicTemplatePage).
--   * render_mode uses DB CHECK values: 'template' | 'shell-only' | 'redirect'
--     (NOT "dynamic-template"; that maps to render_mode='template' + binding).
--   * is_public=false keeps /settings off route-access + template-binding
--     bypass allowlists.
--   * metadata_public=false: classification is not anonymously readable; the
--     public route-metadata mount returns 401 for anon. Authenticated callers
--     receive the row after services/ui-os-service route-metadata fix
--     (authenticated + row exists => 200).
--   * Does NOT alter dos.ui_route_template_binding for /settings (archetype /
--     template_export / version remain seed-owned).
--
-- Follow-up (separate): DYNAMIC_UI_LEGACY_SCHEMA_DRIFT —
--   page-experience / dos.dynamic_ui_routes, contract/foundation /
--   dos.dynamic_ui_modules on some DBs.
--
-- Forward-only, idempotent. Re-runnable.

BEGIN;

INSERT INTO dos.dynamic_ui_route_metadata (
  route,
  render_mode,
  template_binding_required,
  is_public,
  metadata_public,
  metadata,
  notes
) VALUES (
  '/settings',
  'template',
  true,
  false,
  false,
  jsonb_build_object(
    'renderMode', 'template',
    'templateBindingRequired', true,
    'protectedRoute', true
  ),
  'Workspace module settings (module-settings / module.settings.page). Protected: not route-public; anon route-metadata returns 401.'
)
ON CONFLICT (route) DO UPDATE
  SET render_mode                = EXCLUDED.render_mode,
      template_binding_required  = EXCLUDED.template_binding_required,
      is_public                  = EXCLUDED.is_public,
      metadata_public            = EXCLUDED.metadata_public,
      metadata                   = EXCLUDED.metadata,
      notes                      = EXCLUDED.notes,
      version                    = dos.dynamic_ui_route_metadata.version + 1,
      updated_at                 = now();

DO $$
DECLARE
  m_route   TEXT;
  m_mode    TEXT;
  m_tbr     BOOLEAN;
  m_pub     BOOLEAN;
  m_meta    BOOLEAN;
  b_route   TEXT;
  b_arch    TEXT;
  b_export  TEXT;
BEGIN
  SELECT route, render_mode, template_binding_required, is_public, metadata_public
    INTO m_route, m_mode, m_tbr, m_pub, m_meta
    FROM dos.dynamic_ui_route_metadata
   WHERE route = '/settings';

  IF m_route IS NULL THEN
    RAISE EXCEPTION 'assertion failed: /settings missing from dynamic_ui_route_metadata';
  END IF;
  IF m_mode IS DISTINCT FROM 'template' THEN
    RAISE EXCEPTION 'assertion failed: /settings render_mode must be template, got %', m_mode;
  END IF;
  IF m_tbr IS NOT TRUE THEN
    RAISE EXCEPTION 'assertion failed: /settings template_binding_required must be true';
  END IF;
  IF m_pub IS NOT FALSE THEN
    RAISE EXCEPTION 'assertion failed: /settings is_public must be false';
  END IF;
  IF m_meta IS NOT FALSE THEN
    RAISE EXCEPTION 'assertion failed: /settings metadata_public must be false';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'dos' AND table_name = 'ui_route_template_binding'
  ) THEN
    RAISE NOTICE 'ui_route_template_binding missing — skip binding assertion';
    RETURN;
  END IF;

  SELECT route, archetype, template_export
    INTO b_route, b_arch, b_export
    FROM dos.ui_route_template_binding
   WHERE route = '/settings';

  IF b_route IS NULL THEN
    RAISE EXCEPTION 'assertion failed: /settings missing from ui_route_template_binding';
  END IF;
  IF b_arch IS DISTINCT FROM 'module-settings' THEN
    RAISE EXCEPTION 'assertion failed: /settings archetype must be module-settings, got %', b_arch;
  END IF;
  IF b_export IS DISTINCT FROM 'module.settings.page' THEN
    RAISE EXCEPTION 'assertion failed: /settings template_export must be module.settings.page, got %', b_export;
  END IF;
END$$;

COMMIT;
