-- 20260505_0500_module_navigation_order.sql
-- Owner: ui-os-service.
--
-- Phase F-F10 — DB-driven module navigation with explicit ordering and
-- tenant/user overrides.
--
-- Today the workspace sidebar gets its grouped, ordered nav items from
-- the codegen TS file
--   platform/access/dos-access-store/src/generated/module-navigation.registry.ts
-- which is in turn frozen at build time from
--   platform/foundation/contracts/navigation/navigation.json.
--
-- That means: editing the order of pages, hiding a page for one tenant,
-- pinning a page for one user — all require a code deploy. This
-- migration introduces 4 tables so the order of pages per module can be
-- changed at runtime, with the same 6-layer doctrine the rest of the UI
-- already follows:
--
--     1. workspace shell defaults    (dos.workspace_shell_binding)
--     2. PRODUCT (deferred)          dos.ui_override_product           (no nav scope yet)
--     3. MODULE  default            dos.ui_module_nav_group           (this migration)
--                                    dos.ui_module_nav_item            (this migration)
--     4. TENANT  override           dos.ui_module_nav_override_tenant (this migration)
--     5. USER    override + pin     dos.ui_module_nav_override_user   (this migration)
--
-- Resolver endpoint (added in services/ui-os-service):
--   GET /api/ui-os/module-nav?module=<code>
--     → { module_code, groups: [{ id, label_en, label_ar, sort_order,
--                                 items: [{ id, route, icon, permission,
--                                            label_en, label_ar, badge,
--                                            sort_order, pinned }] }] }
-- ordered by (group.effective_sort_order, item.effective_sort_order)
-- where `effective_*` is the deepest defined value across the 3 layers.
--
-- Seed: a sibling migration (20260505_0510_*) imports the 18 Foundation
-- items + 3 Foundation groups from navigation.json so the Foundation
-- module renders identically to today, but driven by the DB.
--
-- Forward-only and idempotent.

BEGIN;

-- =====================================================================
-- ③.a Module nav groups (sections within the sidebar)
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.ui_module_nav_group (
  module_code text    NOT NULL,
  group_id    text    NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  label_key   text,
  label_en    text,
  label_ar    text,
  enabled     boolean NOT NULL DEFAULT true,
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (module_code, group_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_module_nav_group_module
  ON dos.ui_module_nav_group (module_code, sort_order);
COMMENT ON TABLE dos.ui_module_nav_group IS
  'Phase F-F10 layer 3.a: ordered groups (sidebar sections) per module. Groups themselves have sort_order; items reference (module_code, group_id).';

-- =====================================================================
-- ③.b Module nav items
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.ui_module_nav_item (
  module_code text    NOT NULL,
  item_id     text    NOT NULL,
  group_id    text,                              -- nullable = ungrouped
  sort_order  integer NOT NULL DEFAULT 0,
  route       text    NOT NULL,
  icon        text,
  permission  text,
  label_key   text,
  label_en    text,
  label_ar    text,
  badge       text,
  enabled     boolean NOT NULL DEFAULT true,
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (module_code, item_id),
  FOREIGN KEY (module_code, group_id)
    REFERENCES dos.ui_module_nav_group (module_code, group_id)
    ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_ui_module_nav_item_module_group
  ON dos.ui_module_nav_item (module_code, group_id, sort_order);
COMMENT ON TABLE dos.ui_module_nav_item IS
  'Phase F-F10 layer 3.b: ordered items per module. Items optionally belong to a group; both groups and items have explicit sort_order.';

-- =====================================================================
-- ④ Tenant override — sparse: NULLs mean "inherit from module default"
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.ui_module_nav_override_tenant (
  tenant_id   text    NOT NULL,
  module_code text    NOT NULL,
  item_id     text    NOT NULL,
  sort_order  integer,            -- override order (NULL = inherit)
  enabled     boolean,            -- hide/show     (NULL = inherit)
  label_en    text,               -- relabel       (NULL = inherit)
  label_ar    text,               -- relabel       (NULL = inherit)
  badge       text,               -- override badge (NULL = inherit)
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, module_code, item_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_module_nav_override_tenant_module
  ON dos.ui_module_nav_override_tenant (tenant_id, module_code);
COMMENT ON TABLE dos.ui_module_nav_override_tenant IS
  'Phase F-F10 layer 4: per-tenant sparse override. Each non-NULL column wins over the module default; NULL columns inherit.';

-- =====================================================================
-- ⑤ User override — adds `pinned` so users can pin to a top rail
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.ui_module_nav_override_user (
  user_id     text    NOT NULL,
  module_code text    NOT NULL,
  item_id     text    NOT NULL,
  sort_order  integer,
  enabled     boolean,
  pinned      boolean,            -- TRUE = move to a top rail
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_code, item_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_module_nav_override_user_module
  ON dos.ui_module_nav_override_user (user_id, module_code);
COMMENT ON TABLE dos.ui_module_nav_override_user IS
  'Phase F-F10 layer 5: per-user sparse override + pin. Wins over tenant override.';

-- =====================================================================
-- Version-bump triggers (re-uses dos.bump_ui_override_version from 0400)
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
                  WHERE n.nspname='dos' AND p.proname='bump_ui_override_version') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION dos.bump_ui_override_version()
      RETURNS trigger AS $body$
      BEGIN
        NEW.version    := COALESCE(OLD.version, 0) + 1;
        NEW.updated_at := now();
        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql
    $f$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_bump_ui_module_nav_group_version ON dos.ui_module_nav_group;
CREATE TRIGGER trg_bump_ui_module_nav_group_version
  BEFORE UPDATE ON dos.ui_module_nav_group
  FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_override_version();

DROP TRIGGER IF EXISTS trg_bump_ui_module_nav_item_version ON dos.ui_module_nav_item;
CREATE TRIGGER trg_bump_ui_module_nav_item_version
  BEFORE UPDATE ON dos.ui_module_nav_item
  FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_override_version();

DROP TRIGGER IF EXISTS trg_bump_ui_module_nav_override_tenant_version ON dos.ui_module_nav_override_tenant;
CREATE TRIGGER trg_bump_ui_module_nav_override_tenant_version
  BEFORE UPDATE ON dos.ui_module_nav_override_tenant
  FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_override_version();

DROP TRIGGER IF EXISTS trg_bump_ui_module_nav_override_user_version ON dos.ui_module_nav_override_user;
CREATE TRIGGER trg_bump_ui_module_nav_override_user_version
  BEFORE UPDATE ON dos.ui_module_nav_override_user
  FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_override_version();

COMMIT;
