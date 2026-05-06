-- 20260509_0220_workspace_home_shell_only_public_classification.sql
--
-- WORKSPACE_HOME_SHELL_ONLY_NO_CALL_PASS — DB-first fix.
--
-- Bug: authenticated browser session at /workspace-home still triggered
--   GET /api/ui-os/route-metadata?route=/workspace-home → 401
--   GET /api/ui-os/template-binding?route=/workspace-home → 404
-- Root cause:
--   * dos.dynamic_ui_route_metadata.is_public = false on the
--     /workspace-home row.
--   * services/ui-os-service public route-metadata router is mounted
--     BEFORE requireGatewayOrigin; req.principal is undefined when it
--     evaluates is_public, so authenticated callers also receive 401
--     ROUTE_METADATA_UNAUTHENTICATED for non-public rows.
--   * RouteMetadataService.resolve() catches 401 → null;
--     DynamicTemplatePageComponent treats meta=null as "fall through to
--     resolveTemplateBinding(route)" → fires the forbidden
--     /api/ui-os/template-binding call which 404s.
--
-- Fix (doctrine: DB stores; UI-OS resolves; FE renders):
--   The render_mode classification ("shell-only") for a route is
--   non-sensitive *runtime contract metadata*. Anonymous callers
--   discovering that /workspace-home is shell-only does not leak
--   tenant data — the actual workspace surface payload remains
--   auth-gated by /api/ui-os/workspace-runtime + workspaceShellGuard.
--   Promoting this row's is_public flag lets the public route-metadata
--   endpoint return the typed shell-only classification to every
--   caller (authenticated or anonymous), which causes
--   DynamicTemplatePageComponent to short-circuit BEFORE
--   TemplateBindingService is invoked.
--
-- Forward-only, idempotent, re-runnable. No destructive operation.

BEGIN;

-- 1. Promote /workspace-home to is_public=true with explicit shell-only
--    contract metadata. The metadata.renderMode mirror is informational
--    (the resolver reads render_mode column), and the redirect map
--    documents the doctrine: anon callers must be sent to /login by the
--    shell guard before they ever attempt to render the workspace.
INSERT INTO dos.dynamic_ui_route_metadata (
  route, render_mode, template_binding_required, is_public, metadata, notes
) VALUES (
  '/workspace-home',
  'shell-only',
  false,
  true,
  '{
    "renderMode": "shell-only",
    "templateBindingRequired": false,
    "redirect": {
      "anonymous": "/login"
    }
  }'::jsonb,
  'Workspace home — shell-only classification. The runtime envelope (workspace-runtime) and workspaceShellGuard own auth/data gating; classification is publicly readable so the FE can short-circuit template-binding without an authenticated route-metadata call.'
)
ON CONFLICT (route) DO UPDATE
  SET render_mode = EXCLUDED.render_mode,
      template_binding_required = EXCLUDED.template_binding_required,
      is_public = EXCLUDED.is_public,
      metadata = EXCLUDED.metadata,
      notes = EXCLUDED.notes,
      version = dos.dynamic_ui_route_metadata.version + 1,
      updated_at = now();

-- 2. Assertions — fail loudly if the row did not land.
DO $$
DECLARE
  m_mode TEXT;
  m_pub  BOOLEAN;
  m_tbr  BOOLEAN;
BEGIN
  SELECT render_mode, is_public, template_binding_required
    INTO m_mode, m_pub, m_tbr
    FROM dos.dynamic_ui_route_metadata WHERE route = '/workspace-home';
  IF m_mode IS DISTINCT FROM 'shell-only' THEN
    RAISE EXCEPTION '/workspace-home render_mode must be shell-only, got %', m_mode;
  END IF;
  IF m_pub IS NOT TRUE THEN
    RAISE EXCEPTION '/workspace-home is_public must be true (post-fix)';
  END IF;
  IF m_tbr IS NOT FALSE THEN
    RAISE EXCEPTION '/workspace-home template_binding_required must be false';
  END IF;
END$$;

COMMIT;
