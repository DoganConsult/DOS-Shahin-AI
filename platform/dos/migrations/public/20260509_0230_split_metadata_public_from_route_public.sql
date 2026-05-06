-- 20260509_0230_split_metadata_public_from_route_public.sql
--
-- WORKSPACE_HOME_SHELL_ONLY_NO_CALL_PASS — security follow-up.
--
-- Background:
--   The previous migration (20260509_0220) flipped /workspace-home's
--   is_public=true so anonymous SPA bootstrap could resolve the
--   render-mode classification. However is_public is OVERLOADED — it
--   feeds two unrelated allowlists:
--
--     A. classification visibility:
--        services/ui-os-service/src/routes/route-metadata.routes.ts
--        (public router) returns the typed render_mode/redirect row.
--        SAFE: classification leaks no tenant data.
--
--     B. route ACCESS bypass:
--        services/ui-os-service/src/middleware/public-route-allowlist.ts
--        + services/gateway/src/server.ts public template-binding shim
--        bypass requireGatewayOrigin / authGuard for
--        GET /api/ui-os/template-binding?route=<is_public route>.
--        UNSAFE for /workspace-home — it is a protected shell route.
--
-- Fix (split the overloaded flag):
--   * Add column metadata_public BOOLEAN — controls anonymous classification
--     visibility ONLY (route-metadata single-route lookup).
--   * Backfill metadata_public := is_public for every existing row so the
--     anonymous SPA boot still resolves all currently-public classifications.
--   * Tighten /workspace-home: is_public=false (out of route-access bypass
--     allowlists) AND metadata_public=true (FE can still classify it as
--     shell-only without a session).
--
-- Doctrine alignment:
--   * Workspace data remains gated by /api/ui-os/workspace-runtime +
--     workspaceShellGuard.
--   * Template-binding for /workspace-home returns to the gated path
--     (anon → 401), which is correct because the route has no template
--     binding row in the first place and shell-only routes never need one.
--   * The classification metadata is a public runtime contract, not data.
--
-- Forward-only, idempotent. Re-runnable.

BEGIN;

-- 1. New column: anonymous classification visibility.
ALTER TABLE dos.dynamic_ui_route_metadata
  ADD COLUMN IF NOT EXISTS metadata_public BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill — preserve the existing invariant: every row currently
--    is_public=true must remain anonymously classifiable. (Marketing
--    + auth pages are also fully route-public; classification visibility
--    is implied by route publicness.)
UPDATE dos.dynamic_ui_route_metadata
   SET metadata_public = true,
       version = version + 1,
       updated_at = now()
 WHERE is_public = true
   AND metadata_public IS DISTINCT FROM true;

-- 3. /workspace-home — split the flag.
--    is_public        := false  (remove from route-access allowlist)
--    metadata_public  := true   (FE can still classify shell-only)
UPDATE dos.dynamic_ui_route_metadata
   SET is_public      = false,
       metadata_public = true,
       version        = version + 1,
       updated_at     = now()
 WHERE route = '/workspace-home';

-- 4. Index for the new public-classification lookup.
CREATE INDEX IF NOT EXISTS ix_dynamic_ui_route_metadata_metadata_public
  ON dos.dynamic_ui_route_metadata(metadata_public) WHERE metadata_public = true;

-- 5. Grants — the runtime ui-os roles must continue reading the table.
GRANT SELECT ON dos.dynamic_ui_route_metadata TO dos_app, dos_auth;

-- 6. Assertions — fail loudly on regression.
DO $$
DECLARE
  m_pub  BOOLEAN;
  m_meta BOOLEAN;
  m_mode TEXT;
  bad_count INT;
BEGIN
  SELECT is_public, metadata_public, render_mode
    INTO m_pub, m_meta, m_mode
    FROM dos.dynamic_ui_route_metadata WHERE route = '/workspace-home';
  IF m_pub IS NOT FALSE THEN
    RAISE EXCEPTION '/workspace-home is_public must be false (route-access tightened)';
  END IF;
  IF m_meta IS NOT TRUE THEN
    RAISE EXCEPTION '/workspace-home metadata_public must be true (classification still readable)';
  END IF;
  IF m_mode IS DISTINCT FROM 'shell-only' THEN
    RAISE EXCEPTION '/workspace-home render_mode must remain shell-only, got %', m_mode;
  END IF;

  SELECT COUNT(*) INTO bad_count
    FROM dos.dynamic_ui_route_metadata
   WHERE is_public = true AND metadata_public IS DISTINCT FROM true;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'invariant: every is_public=true row must have metadata_public=true (% rows broken)', bad_count;
  END IF;
END$$;

COMMIT;
