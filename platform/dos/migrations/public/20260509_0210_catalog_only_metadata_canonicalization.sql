-- =============================================================================
-- Migration: 20260509_0210_catalog_only_metadata_canonicalization
-- Purpose:
--   Canonicalize the registry-side disposition of the 14 Carbon vocabulary
--   primitives that live under `workspace.action.*` and `workspace.data.*`.
--   These keys are approved Carbon vocabulary entries (vendor=ibm-carbon,
--   carbon_key set) but they are NOT first-class workspace-shell surfaces:
--   they are inner-component primitives consumed by other renderers. The
--   workspace audit harness (v2 GATE_PASS) already classifies them as
--   catalog-only based on the absence of `renderer_key`, but the catalog
--   disposition was implicit. This migration makes it explicit in DB
--   metadata so the UI-OS resolver, the audit harness, and any future
--   contract gate share a single source of truth.
--
-- Scope (closed allowlist — exactly the 14 keys):
--   workspace.action.button
--   workspace.action.icon-button
--   workspace.action.inline-notification
--   workspace.action.modal
--   workspace.action.overflow-menu
--   workspace.action.overflow-menu-option
--   workspace.action.toast-notification
--   workspace.data.data-table
--   workspace.data.pagination
--   workspace.data.structured-list
--   workspace.data.table-batch-actions
--   workspace.data.table-toolbar
--   workspace.data.table-toolbar-actions
--   workspace.data.table-toolbar-search
--
-- Metadata flags asserted on each row (merged into existing metadata):
--   catalog_only      : true   -- vocabulary entry only
--   shell_renderable  : false  -- must NOT be emitted by workspace-runtime
--   workspace_only    : false  -- not workspace-shell scoped
--
-- Doctrine:
--   - Closed allowlist; no LIKE/regex sweep.
--   - No deletion of registry rows; they remain approved Carbon vocabulary.
--   - No deletion of tenant bindings; binding drift documented separately
--     (platform/docs/workspace-contract-audit/catalog-only-binding-drift.md).
--   - Idempotent: re-applying merges the same keys; existing metadata is
--     preserved via jsonb concatenation.
--   - Loud failure if any of the 14 expected rows is missing.
--   - No manual writes to dos.platform_migrations.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  catalog_keys text[] := ARRAY[
    'workspace.action.button',
    'workspace.action.icon-button',
    'workspace.action.inline-notification',
    'workspace.action.modal',
    'workspace.action.overflow-menu',
    'workspace.action.overflow-menu-option',
    'workspace.action.toast-notification',
    'workspace.data.data-table',
    'workspace.data.pagination',
    'workspace.data.structured-list',
    'workspace.data.table-batch-actions',
    'workspace.data.table-toolbar',
    'workspace.data.table-toolbar-actions',
    'workspace.data.table-toolbar-search'
  ];
  k text;
  found boolean;
BEGIN
  FOREACH k IN ARRAY catalog_keys LOOP
    SELECT EXISTS (
      SELECT 1 FROM dos.dynamic_ui_component_registry WHERE component_key = k
    ) INTO found;
    IF NOT found THEN
      RAISE EXCEPTION
        'expected registry row missing: %; refusing to silently skip canonicalization', k;
    END IF;
  END LOOP;

  UPDATE dos.dynamic_ui_component_registry
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                      'catalog_only',     true,
                      'shell_renderable', false,
                      'workspace_only',   false
                    )
   WHERE component_key = ANY(catalog_keys);
END $$;

-- Post-update assertion: every listed row must now expose all three flags
-- with the canonical values.
DO $$
DECLARE
  catalog_keys text[] := ARRAY[
    'workspace.action.button',
    'workspace.action.icon-button',
    'workspace.action.inline-notification',
    'workspace.action.modal',
    'workspace.action.overflow-menu',
    'workspace.action.overflow-menu-option',
    'workspace.action.toast-notification',
    'workspace.data.data-table',
    'workspace.data.pagination',
    'workspace.data.structured-list',
    'workspace.data.table-batch-actions',
    'workspace.data.table-toolbar',
    'workspace.data.table-toolbar-actions',
    'workspace.data.table-toolbar-search'
  ];
  bad_count integer;
BEGIN
  SELECT COUNT(*) INTO bad_count
    FROM dos.dynamic_ui_component_registry
   WHERE component_key = ANY(catalog_keys)
     AND NOT (
           metadata->>'catalog_only'     = 'true'
       AND metadata->>'shell_renderable' = 'false'
       AND metadata->>'workspace_only'   = 'false'
     );
  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'POST-UPDATE ASSERTION FAILED: % row(s) missing canonical catalog_only flags', bad_count;
  END IF;
END $$;

COMMIT;
