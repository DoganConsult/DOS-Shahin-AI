-- 20260510_0210_p0_2_foundation_route_metadata_contract.sql
--
-- P0-2 — Contract rows for /foundation + /foundation/* in
-- dos.dynamic_ui_route_metadata (mirror 20260510_0100_settings_route_metadata_contract).
--
-- Eliminates ROUTE_METADATA_NOT_FOUND for routes backed by Phase G bindings
-- (20260503_0900_phase_g_progressive_modules_bindings.sql).
--
-- Contract:
--   * is_public = false, metadata_public = false
--   * render_mode = 'template'
--   * template_binding_required = true
--   * metadata aligns with /settings protected-template pattern.
--
-- Does NOT mutate dos.ui_route_template_binding.
--
-- Forward-only, idempotent.

BEGIN;

DO $$
DECLARE
  missing integer;
  hub_mode  text;
  hub_pub   boolean;
  hub_meta  boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'dos' AND table_name = 'ui_route_template_binding'
  ) THEN
    RAISE NOTICE 'P0-2: dos.ui_route_template_binding missing — skip inserts and assertions';
    RETURN;
  END IF;

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
      'Foundation progressive route (%s → %s). Protected: anon route-metadata 401.',
      b.archetype,
      b.template_export
    )
  FROM dos.ui_route_template_binding b
  WHERE b.route = '/foundation'
     OR b.route LIKE '/foundation/%'
  ON CONFLICT (route) DO UPDATE
    SET render_mode                = EXCLUDED.render_mode,
        template_binding_required  = EXCLUDED.template_binding_required,
        is_public                  = EXCLUDED.is_public,
        metadata_public            = EXCLUDED.metadata_public,
        metadata                   = EXCLUDED.metadata,
        notes                      = EXCLUDED.notes,
        version                    = dos.dynamic_ui_route_metadata.version + 1,
        updated_at                 = now();

  SELECT count(*) INTO missing
    FROM dos.ui_route_template_binding b
   WHERE (b.route = '/foundation' OR b.route LIKE '/foundation/%')
     AND NOT EXISTS (
           SELECT 1
             FROM dos.dynamic_ui_route_metadata m
            WHERE m.route = b.route
         );

  IF missing <> 0 THEN
    RAISE EXCEPTION 'P0-2 assertion: % foundation bindings lack dynamic_ui_route_metadata row', missing;
  END IF;

  SELECT render_mode, is_public, metadata_public
    INTO hub_mode, hub_pub, hub_meta
    FROM dos.dynamic_ui_route_metadata
   WHERE route = '/foundation';

  IF hub_mode IS NULL THEN
    RAISE EXCEPTION 'assertion failed: /foundation missing from dynamic_ui_route_metadata';
  END IF;
  IF hub_mode IS DISTINCT FROM 'template' THEN
    RAISE EXCEPTION 'assertion failed: /foundation render_mode must be template, got %', hub_mode;
  END IF;
  IF hub_pub IS NOT FALSE OR hub_meta IS NOT FALSE THEN
    RAISE EXCEPTION 'assertion failed: /foundation is_public/metadata_public must be false';
  END IF;
  IF (SELECT template_binding_required FROM dos.dynamic_ui_route_metadata WHERE route = '/foundation')
     IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'assertion failed: /foundation template_binding_required must be true';
  END IF;
END $$;

COMMIT;
