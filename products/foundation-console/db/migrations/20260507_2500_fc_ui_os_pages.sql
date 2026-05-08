-- F9 — fc_ui_os pages + page_surfaces + seed for path '/'.
-- Idempotent. Safe re-run.
-- Doctrine:
--   - DB stays snake_case. Resolver normalizes to camelCase before emit.
--   - componentKey values come ONLY from F7-approved baseline.
--   - tenant_id '*' is the public/default tenant scope.
--   - This migration also DELETEs the F8 main-zone shell placeholders since
--     page-runtime is now the source of truth for the main zone.

BEGIN;

-- ── pages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_ui_os.pages (
  id              text        NOT NULL,
  tenant_id       text        NOT NULL,
  product_code    text        NOT NULL,
  path            text        NOT NULL,
  title_i18n_key  text,
  title_fallback  text,
  perms_required  text[]      NOT NULL DEFAULT '{}',
  enabled         boolean     NOT NULL DEFAULT true,
  version         integer     NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_fc_pages           PRIMARY KEY (tenant_id, product_code, id),
  CONSTRAINT uq_fc_pages_path      UNIQUE      (tenant_id, product_code, path)
);

CREATE INDEX IF NOT EXISTS ix_fc_pages_path
  ON fc_ui_os.pages (tenant_id, product_code, path) WHERE enabled = true;

COMMENT ON TABLE fc_ui_os.pages IS
  'Per-tenant per-product page route catalog. Resolver maps title_i18n_key/title_fallback to FcI18nLabel.';

-- ── page_surfaces ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_ui_os.page_surfaces (
  id              bigserial PRIMARY KEY,
  tenant_id       text        NOT NULL,
  product_code    text        NOT NULL,
  page_id         text        NOT NULL,
  surface_id      text        NOT NULL,
  slot_key        text        NOT NULL,
  position        integer     NOT NULL DEFAULT 0,
  enabled         boolean     NOT NULL DEFAULT true,
  version         integer     NOT NULL DEFAULT 1,
  component_key   text        NOT NULL,
  component_type  text,
  renderer_key    text,
  carbon_key      text,
  perms_required  text[]      NOT NULL DEFAULT '{}',
  props           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_fc_page_surfaces_unique UNIQUE (tenant_id, product_code, page_id, surface_id),
  CONSTRAINT fk_fc_page_surfaces_page  FOREIGN KEY (tenant_id, product_code, page_id)
    REFERENCES fc_ui_os.pages (tenant_id, product_code, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_fc_page_surfaces_lookup
  ON fc_ui_os.page_surfaces (tenant_id, product_code, page_id, position)
  WHERE enabled = true;

COMMENT ON TABLE fc_ui_os.page_surfaces IS
  'Page-scoped surface placement. Resolver normalizes to FcWorkspaceSurface (camelCase).';

-- ── Update-trigger reuse ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fc_pages_touch_updated_at') THEN
    CREATE TRIGGER trg_fc_pages_touch_updated_at BEFORE UPDATE ON fc_ui_os.pages
      FOR EACH ROW EXECUTE FUNCTION fc_ui_os.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fc_page_surfaces_touch_updated_at') THEN
    CREATE TRIGGER trg_fc_page_surfaces_touch_updated_at BEFORE UPDATE ON fc_ui_os.page_surfaces
      FOR EACH ROW EXECUTE FUNCTION fc_ui_os.touch_updated_at();
  END IF;
END
$$;

-- ── Grants ───────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON fc_ui_os.pages         TO fc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON fc_ui_os.page_surfaces TO fc_app;
GRANT USAGE, SELECT ON SEQUENCE fc_ui_os.page_surfaces_id_seq  TO fc_app;

-- ── Cleanup: F8 main-zone shell placeholders are now owned by page-runtime ──
DELETE FROM fc_ui_os.workspace_shell_binding
 WHERE tenant_id = '*'
   AND product_code = 'foundation-console'
   AND zone = 'main'
   AND surface_id IN ('fc.surface.content.main', 'fc.surface.main.empty');

-- ── Seed: page for path '/' ──────────────────────────────────────────
INSERT INTO fc_ui_os.pages
  (id, tenant_id, product_code, path, title_i18n_key, title_fallback, perms_required, enabled, version)
VALUES
  ('fc.page.home', '*', 'foundation-console', '/',
   'fc.page.home.title', 'Home', '{}'::text[], true, 1)
ON CONFLICT (tenant_id, product_code, id) DO UPDATE
  SET path           = EXCLUDED.path,
      title_i18n_key = EXCLUDED.title_i18n_key,
      title_fallback = EXCLUDED.title_fallback,
      perms_required = EXCLUDED.perms_required,
      enabled        = EXCLUDED.enabled,
      version        = EXCLUDED.version,
      updated_at     = now();

-- ── Seed: page surfaces for '/' ──────────────────────────────────────
INSERT INTO fc_ui_os.page_surfaces
  (tenant_id, product_code, page_id, surface_id, slot_key, position, enabled, version,
   component_key, component_type, renderer_key, carbon_key, perms_required, props)
VALUES
  ('*', 'foundation-console', 'fc.page.home',
   'fc.page.home.surface.welcome', 'page.main', 0, true, 1,
   'workspace.emptyState', 'visual', 'fc.renderer.emptyState', NULL, '{}'::text[],
   '{"title":"Foundation Console — Home","description":"Page runtime is live. Add page surfaces in fc_ui_os.page_surfaces."}'::jsonb)
ON CONFLICT (tenant_id, product_code, page_id, surface_id) DO UPDATE
  SET slot_key       = EXCLUDED.slot_key,
      position       = EXCLUDED.position,
      enabled        = EXCLUDED.enabled,
      version        = EXCLUDED.version,
      component_key  = EXCLUDED.component_key,
      component_type = EXCLUDED.component_type,
      renderer_key   = EXCLUDED.renderer_key,
      carbon_key     = EXCLUDED.carbon_key,
      perms_required = EXCLUDED.perms_required,
      props          = EXCLUDED.props,
      updated_at     = now();

-- ── Validation ───────────────────────────────────────────────────────
DO $$
DECLARE
  pages_count int;
  surfaces_count int;
BEGIN
  SELECT count(*) INTO pages_count    FROM fc_ui_os.pages
    WHERE tenant_id='*' AND product_code='foundation-console' AND enabled=true;
  SELECT count(*) INTO surfaces_count FROM fc_ui_os.page_surfaces
    WHERE tenant_id='*' AND product_code='foundation-console' AND enabled=true;
  IF pages_count    < 1 THEN RAISE EXCEPTION 'F9 seed: pages<1 (got %)',          pages_count;    END IF;
  IF surfaces_count < 1 THEN RAISE EXCEPTION 'F9 seed: page_surfaces<1 (got %)',  surfaces_count; END IF;
END
$$;

COMMIT;
