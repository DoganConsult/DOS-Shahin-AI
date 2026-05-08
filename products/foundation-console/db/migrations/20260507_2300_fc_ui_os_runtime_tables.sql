-- F3 — fc_ui_os structural tables for workspace runtime.
-- Idempotent. Safe re-run. Owned by foundation-ui-os service.
--
-- Tables:
--   fc_ui_os.workspace_shell_binding   one row per surface (component placement)
--   fc_ui_os.shell_nav_groups          nav groups (no built-in defaults)
--   fc_ui_os.shell_nav_items           nav items (action stored as jsonb FcShellAction)
--
-- DB stays snake_case. The resolver normalizes to camelCase FcWorkspaceRuntime
-- before emitting to clients. Empty rows = empty runtime. No fallback.

BEGIN;

CREATE SCHEMA IF NOT EXISTS fc_ui_os;

-- ── workspace_shell_binding ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_ui_os.workspace_shell_binding (
  id              bigserial PRIMARY KEY,
  tenant_id       text        NOT NULL,
  product_code    text        NOT NULL,
  surface_id      text        NOT NULL,
  slot_key        text        NOT NULL,
  zone            text        NOT NULL,
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
  CONSTRAINT uq_wsb_tenant_product_surface UNIQUE (tenant_id, product_code, surface_id)
);

CREATE INDEX IF NOT EXISTS ix_wsb_tenant_product_zone_position
  ON fc_ui_os.workspace_shell_binding (tenant_id, product_code, zone, position);

CREATE INDEX IF NOT EXISTS ix_wsb_enabled_lookup
  ON fc_ui_os.workspace_shell_binding (tenant_id, product_code) WHERE enabled = true;

COMMENT ON TABLE fc_ui_os.workspace_shell_binding IS
  'Per-tenant per-product surface placement. Resolver normalizes to FcWorkspaceSurface (camelCase).';

-- ── shell_nav_groups ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_ui_os.shell_nav_groups (
  id              text        NOT NULL,
  tenant_id       text        NOT NULL,
  product_code    text        NOT NULL,
  position        integer     NOT NULL DEFAULT 0,
  icon            text,
  label_i18n_key  text,
  label_fallback  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_shell_nav_groups PRIMARY KEY (tenant_id, product_code, id)
);

CREATE INDEX IF NOT EXISTS ix_sng_tenant_product_position
  ON fc_ui_os.shell_nav_groups (tenant_id, product_code, position);

COMMENT ON TABLE fc_ui_os.shell_nav_groups IS
  'Nav groups per tenant+product. Resolver maps label_i18n_key/label_fallback to FcI18nLabel.';

-- ── shell_nav_items ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_ui_os.shell_nav_items (
  id              text        NOT NULL,
  tenant_id       text        NOT NULL,
  product_code    text        NOT NULL,
  group_id        text,
  position        integer     NOT NULL DEFAULT 0,
  icon            text,
  label_i18n_key  text,
  label_fallback  text,
  action          jsonb       NOT NULL,
  perms_required  text[]      NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_shell_nav_items PRIMARY KEY (tenant_id, product_code, id),
  CONSTRAINT chk_action_kind_present CHECK (jsonb_typeof(action) = 'object' AND (action ? 'kind'))
);

CREATE INDEX IF NOT EXISTS ix_sni_tenant_product_group_position
  ON fc_ui_os.shell_nav_items (tenant_id, product_code, group_id, position);

COMMENT ON TABLE fc_ui_os.shell_nav_items IS
  'Nav items per tenant+product. action is jsonb FcShellAction; resolver validates kind.';

-- ── Update-trigger for updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION fc_ui_os.touch_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_wsb_touch_updated_at') THEN
    CREATE TRIGGER trg_wsb_touch_updated_at BEFORE UPDATE ON fc_ui_os.workspace_shell_binding
      FOR EACH ROW EXECUTE FUNCTION fc_ui_os.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sng_touch_updated_at') THEN
    CREATE TRIGGER trg_sng_touch_updated_at BEFORE UPDATE ON fc_ui_os.shell_nav_groups
      FOR EACH ROW EXECUTE FUNCTION fc_ui_os.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sni_touch_updated_at') THEN
    CREATE TRIGGER trg_sni_touch_updated_at BEFORE UPDATE ON fc_ui_os.shell_nav_items
      FOR EACH ROW EXECUTE FUNCTION fc_ui_os.touch_updated_at();
  END IF;
END
$$;

-- ── Grants for fc_app runtime role ───────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON fc_ui_os.workspace_shell_binding TO fc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON fc_ui_os.shell_nav_groups        TO fc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON fc_ui_os.shell_nav_items         TO fc_app;
GRANT USAGE, SELECT ON SEQUENCE fc_ui_os.workspace_shell_binding_id_seq TO fc_app;

-- ── Validation ───────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='fc_ui_os' AND table_name='workspace_shell_binding') THEN
    RAISE EXCEPTION 'fc_ui_os.workspace_shell_binding missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='fc_ui_os' AND table_name='shell_nav_groups') THEN
    RAISE EXCEPTION 'fc_ui_os.shell_nav_groups missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='fc_ui_os' AND table_name='shell_nav_items') THEN
    RAISE EXCEPTION 'fc_ui_os.shell_nav_items missing';
  END IF;
END
$$;

COMMIT;
