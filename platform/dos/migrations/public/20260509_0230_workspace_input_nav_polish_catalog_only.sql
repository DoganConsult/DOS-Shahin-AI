-- =============================================================================
-- Migration: 20260509_0230_workspace_input_nav_polish_catalog_only
-- Purpose:
--   Canonicalize the registry-side disposition of 32 Carbon vocabulary
--   primitives under workspace.input.*, workspace.nav.*, and
--   workspace.polish.*.
--
--   These keys are approved Carbon vocabulary entries but are NOT
--   first-class workspace-shell surfaces — they are inner-component
--   primitives consumed by other renderers (form fields, navigation
--   layout helpers, decorative polish). They have no renderer_key and
--   must never be emitted by the workspace-runtime resolver as shell
--   surfaces.
--
--   The workspace audit (Phase 2 / LATENT-32-NO-FLAGS) classified these
--   rows as a latent risk: the resolver SQL filter
--     COALESCE(metadata->>'catalog_only','false') <> 'true'
--   passes them through to the in-memory gate, which currently drops
--   them because their binding perms_required=[] and zone='main' is not
--   in SAFE_EMPTY_PERMS_ZONES. If a future migration adds non-empty
--   perms to any of these bindings they would reach toFrontendSurface()
--   with renderer_key=null and cause a runtime error.
--
--   This migration closes the gap by making the SQL filter authoritative.
--
-- Scope (closed allowlist — exactly 32 keys):
--   workspace.input.*  (12 rows):
--     checkbox, combo-box, date-picker, dropdown, multi-select,
--     number-input, radio, search, select, text-area, text-input, toggle
--   workspace.nav.* (10 rows):
--     breadcrumb, clickable-tile, column, expandable-tile, grid, layer,
--     tab, tabs, tag, tile
--   workspace.polish.* (10 rows):
--     accordion, context-menu, file-uploader, inline-loading, popover,
--     progress-bar, skeleton-placeholder, skeleton-text, toggletip, tooltip
--
-- Metadata flags set on each row (merged via jsonb concatenation):
--   catalog_only      : true   -- vocabulary entry only; SQL filter drops it
--   shell_renderable  : false  -- must NOT be emitted by workspace-runtime
--   workspace_only    : false  -- not workspace-shell scoped
--
-- Doctrine (AGENTS.md):
--   - Closed allowlist; no LIKE/regex sweep.
--   - No deletion of registry rows; they remain approved Carbon vocabulary.
--   - No deletion of tenant bindings; binding drift documented separately.
--   - Idempotent: re-applying merges the same flags; existing metadata keys
--     are preserved via jsonb concatenation (||).
--   - Loud failure if any of the 32 expected rows is missing.
--   - Loud failure if any row still lacks the three flags after update.
--   - No renderer_key added; no COMPONENT_MAP changes; no ShellHost changes.
--   - No manual writes to dos.platform_migrations.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  catalog_keys text[] := ARRAY[
    -- workspace.input.* (12)
    'workspace.input.checkbox',
    'workspace.input.combo-box',
    'workspace.input.date-picker',
    'workspace.input.dropdown',
    'workspace.input.multi-select',
    'workspace.input.number-input',
    'workspace.input.radio',
    'workspace.input.search',
    'workspace.input.select',
    'workspace.input.text-area',
    'workspace.input.text-input',
    'workspace.input.toggle',
    -- workspace.nav.* (10)
    'workspace.nav.breadcrumb',
    'workspace.nav.clickable-tile',
    'workspace.nav.column',
    'workspace.nav.expandable-tile',
    'workspace.nav.grid',
    'workspace.nav.layer',
    'workspace.nav.tab',
    'workspace.nav.tabs',
    'workspace.nav.tag',
    'workspace.nav.tile',
    -- workspace.polish.* (10)
    'workspace.polish.accordion',
    'workspace.polish.context-menu',
    'workspace.polish.file-uploader',
    'workspace.polish.inline-loading',
    'workspace.polish.popover',
    'workspace.polish.progress-bar',
    'workspace.polish.skeleton-placeholder',
    'workspace.polish.skeleton-text',
    'workspace.polish.toggletip',
    'workspace.polish.tooltip'
  ];
  k       text;
  found   boolean;
  updated integer;
BEGIN
  -- Pre-update: verify every expected key exists in the registry.
  -- Fail loudly rather than silently skipping a missing row.
  FOREACH k IN ARRAY catalog_keys LOOP
    SELECT EXISTS (
      SELECT 1 FROM dos.dynamic_ui_component_registry WHERE component_key = k
    ) INTO found;
    IF NOT found THEN
      RAISE EXCEPTION
        'LATENT-32-NO-FLAGS: expected registry row missing: %; '
        'refusing to silently skip canonicalization', k;
    END IF;
  END LOOP;

  -- Apply metadata flags via jsonb merge. Existing metadata keys are
  -- preserved; the three disposition flags are set to the canonical values.
  UPDATE dos.dynamic_ui_component_registry
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                      'catalog_only',     true,
                      'shell_renderable', false,
                      'workspace_only',   false
                    )
   WHERE component_key = ANY(catalog_keys);

  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated <> 32 THEN
    RAISE EXCEPTION
      'LATENT-32-NO-FLAGS: expected 32 rows updated, got %; '
      'transaction will rollback', updated;
  END IF;

  RAISE NOTICE 'LATENT-32-NO-FLAGS: % rows updated with catalog_only/shell_renderable/workspace_only flags', updated;
END $$;

-- Post-update assertion: every listed row must expose all three flags
-- with the canonical values. Any mismatch rolls back the transaction.
DO $$
DECLARE
  catalog_keys text[] := ARRAY[
    'workspace.input.checkbox',
    'workspace.input.combo-box',
    'workspace.input.date-picker',
    'workspace.input.dropdown',
    'workspace.input.multi-select',
    'workspace.input.number-input',
    'workspace.input.radio',
    'workspace.input.search',
    'workspace.input.select',
    'workspace.input.text-area',
    'workspace.input.text-input',
    'workspace.input.toggle',
    'workspace.nav.breadcrumb',
    'workspace.nav.clickable-tile',
    'workspace.nav.column',
    'workspace.nav.expandable-tile',
    'workspace.nav.grid',
    'workspace.nav.layer',
    'workspace.nav.tab',
    'workspace.nav.tabs',
    'workspace.nav.tag',
    'workspace.nav.tile',
    'workspace.polish.accordion',
    'workspace.polish.context-menu',
    'workspace.polish.file-uploader',
    'workspace.polish.inline-loading',
    'workspace.polish.popover',
    'workspace.polish.progress-bar',
    'workspace.polish.skeleton-placeholder',
    'workspace.polish.skeleton-text',
    'workspace.polish.toggletip',
    'workspace.polish.tooltip'
  ];
  bad_count integer;
BEGIN
  SELECT COUNT(*) INTO bad_count
    FROM dos.dynamic_ui_component_registry
   WHERE component_key = ANY(catalog_keys)
     AND NOT (
           (metadata->>'catalog_only')     = 'true'
       AND (metadata->>'shell_renderable') = 'false'
       AND (metadata->>'workspace_only')   = 'false'
     );
  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'LATENT-32-NO-FLAGS POST-UPDATE ASSERTION FAILED: '
      '% row(s) still missing canonical catalog_only/shell_renderable/workspace_only flags',
      bad_count;
  END IF;
  RAISE NOTICE 'LATENT-32-NO-FLAGS: post-update assertion passed — 0 rows missing flags';
END $$;

COMMIT;
