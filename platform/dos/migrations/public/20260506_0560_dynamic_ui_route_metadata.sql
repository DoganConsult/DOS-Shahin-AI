-- 20260506_0560_dynamic_ui_route_metadata.sql
-- Forward-only. Introduces a route-metadata contract that lets the SPA
-- decide whether a given route should resolve a template binding at all.
--
-- Doctrine context:
--   /workspace-home is intentionally shell-only — the workspace shell
--   (header, sidebar, main zone surfaces) is the entire experience until
--   REAL_WORKSPACE_HOME_CONTENT_WAVE delivers a canonical template
--   contract. Calling /api/ui-os/template-binding for it would either
--   return 404 (and the SPA would then render a generic empty state) or
--   resurrect demo content. Both are forbidden.
--
-- A row in dos.dynamic_ui_route_metadata declares per-route render
-- semantics; the SPA's DynamicTemplatePageComponent reads it before
-- deciding to call /api/ui-os/template-binding.
--
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.dynamic_ui_route_metadata (
  route                      TEXT PRIMARY KEY,
  render_mode                TEXT NOT NULL DEFAULT 'template',
  template_binding_required  BOOLEAN NOT NULL DEFAULT true,
  notes                      TEXT,
  version                    INTEGER NOT NULL DEFAULT 1,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_dynamic_ui_route_metadata_render_mode CHECK (
    render_mode IN ('template', 'shell-only', 'redirect')
  )
);

CREATE INDEX IF NOT EXISTS ix_dynamic_ui_route_metadata_render_mode
  ON dos.dynamic_ui_route_metadata(render_mode);

INSERT INTO dos.dynamic_ui_route_metadata (
  route, render_mode, template_binding_required, notes
) VALUES (
  '/workspace-home',
  'shell-only',
  false,
  'Shell-only landing surface. SPA must NOT call /api/ui-os/template-binding for this route. Workspace runtime envelope (/api/ui-os/workspace-runtime) is the sole content source until REAL_WORKSPACE_HOME_CONTENT_WAVE.'
)
ON CONFLICT (route) DO UPDATE
  SET render_mode = EXCLUDED.render_mode,
      template_binding_required = EXCLUDED.template_binding_required,
      notes = EXCLUDED.notes,
      version = dos.dynamic_ui_route_metadata.version + 1,
      updated_at = now();

COMMIT;
