-- 20260505_0400_ui_override_layers.sql
-- Owner: ui-os-service.
--
-- Phase F-F9 — Multi-layer Dynamic-UI override architecture.
--
-- Today the resolver merges only two sources for a route:
--   ① dos.ui_route_template_binding.props (route layer)
--   ② per-archetype shaped-row tables (kpi/nba/tab/...)
--
-- This migration introduces FOUR new override layers so the resolved
-- payload becomes the deep-merge of (broader → narrower):
--
--     1. workspace shell defaults  (dos.workspace_shell_binding — exists)
--     2. PRODUCT  (new)            dos.ui_override_product
--     3. MODULE   (new)            dos.ui_override_module
--     4. ROUTE    (exists)         dos.ui_route_template_binding.props
--     5. TENANT   (new)            dos.ui_override_tenant
--     6. USER     (new)            dos.ui_override_user
--
-- Resolver reads `req.principal.{sub,tenantId}` + the SPA-supplied
-- `x-product-code` header (defaulting to 'shahin-ai') + a derived
-- `moduleCode` (first path segment with a route→module map) and applies
-- the merge in the order above. Each layer's `patch` is a sparse jsonb
-- object: existing keys overwrite, missing keys leave the prior layer
-- alone. Arrays REPLACE (not concat) — that's the single explicit rule
-- the FE side must understand.
--
-- An export endpoint
--     GET /api/ui-os/export?scope=tenant&tenant_id=...
-- is added in services/ui-os-service/src/routes/template-binding.routes.ts
-- and emits the merged payload for every binding row, suitable for
-- bundling as a tenant snapshot.
--
-- Forward-only and idempotent.

BEGIN;

-- =====================================================================
-- ② Product layer (broadest non-shell scope)
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.ui_override_product (
  product_code text PRIMARY KEY,
  patch        jsonb NOT NULL DEFAULT '{}'::jsonb,
  version      integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  dos.ui_override_product IS
  'Phase F-F9 layer 2: per-product UI patch (e.g. shahin-ai, doganhub). Sparse jsonb merged after workspace defaults, before module layer.';
COMMENT ON COLUMN dos.ui_override_product.patch IS
  'Sparse jsonb. Object keys replace; arrays REPLACE in full.';

-- =====================================================================
-- ③ Module layer
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.ui_override_module (
  module_code text PRIMARY KEY,
  patch       jsonb NOT NULL DEFAULT '{}'::jsonb,
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE dos.ui_override_module IS
  'Phase F-F9 layer 3: per-module UI patch (e.g. compliance, risk, foundation, platform-admin). Sparse jsonb merged after product, before route.';

-- =====================================================================
-- ⑤ Tenant layer (route-scoped; route='*' = applies to every route)
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.ui_override_tenant (
  tenant_id  text NOT NULL,
  route      text NOT NULL,                  -- '*' = wildcard / all routes
  patch      jsonb NOT NULL DEFAULT '{}'::jsonb,
  version    integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, route)
);
CREATE INDEX IF NOT EXISTS ix_ui_override_tenant_route
  ON dos.ui_override_tenant (route);
COMMENT ON TABLE dos.ui_override_tenant IS
  'Phase F-F9 layer 5: per-tenant UI patch. Two rows resolved in order: (tenant_id, ''*'') then (tenant_id, route) — both deep-merged after the route layer, with the specific row winning.';

-- =====================================================================
-- ⑥ User layer (route-scoped; route='*' = applies to every route)
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.ui_override_user (
  user_id    text NOT NULL,
  route      text NOT NULL,                  -- '*' = wildcard
  patch      jsonb NOT NULL DEFAULT '{}'::jsonb,
  version    integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, route)
);
CREATE INDEX IF NOT EXISTS ix_ui_override_user_route
  ON dos.ui_override_user (route);
COMMENT ON TABLE dos.ui_override_user IS
  'Phase F-F9 layer 6: per-user UI patch. Final, narrowest layer — deep-merged after the tenant layer.';

-- =====================================================================
-- Version-bump triggers (mirrors dos.ui_route_template_binding pattern)
-- =====================================================================
CREATE OR REPLACE FUNCTION dos.bump_ui_override_version()
RETURNS trigger AS $$
BEGIN
  NEW.version    := COALESCE(OLD.version, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_ui_override_product_version ON dos.ui_override_product;
CREATE TRIGGER trg_bump_ui_override_product_version
  BEFORE UPDATE ON dos.ui_override_product
  FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_override_version();

DROP TRIGGER IF EXISTS trg_bump_ui_override_module_version ON dos.ui_override_module;
CREATE TRIGGER trg_bump_ui_override_module_version
  BEFORE UPDATE ON dos.ui_override_module
  FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_override_version();

DROP TRIGGER IF EXISTS trg_bump_ui_override_tenant_version ON dos.ui_override_tenant;
CREATE TRIGGER trg_bump_ui_override_tenant_version
  BEFORE UPDATE ON dos.ui_override_tenant
  FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_override_version();

DROP TRIGGER IF EXISTS trg_bump_ui_override_user_version ON dos.ui_override_user;
CREATE TRIGGER trg_bump_ui_override_user_version
  BEFORE UPDATE ON dos.ui_override_user
  FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_override_version();

COMMIT;
