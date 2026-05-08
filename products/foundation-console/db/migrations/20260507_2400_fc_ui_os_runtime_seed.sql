-- F8: Seed first real Foundation Console runtime rows.
-- Idempotent. Safe re-run. Uses ON CONFLICT DO UPDATE to refresh content.
-- Doctrine:
--   - componentKey values come ONLY from F7-approved baseline (11 keys).
--   - tenant_id '*' is the public/default tenant scope (no per-tenant binding required for F8).
--   - product_code = 'foundation-console' (matches gateway default and resolver lookup).
--   - All emitted JSON stays camelCase (resolver normalizes snake_case → camelCase).

BEGIN;

-- ── workspace_shell_binding ─────────────────────────────────────────
INSERT INTO fc_ui_os.workspace_shell_binding
  (tenant_id, product_code, surface_id, slot_key, zone, position, enabled, version,
   component_key, component_type, renderer_key, carbon_key, perms_required, props)
VALUES
  ('*', 'foundation-console', 'fc.surface.header.main',
   'header.main', 'header', 0, true, 1,
   'workspace.header', 'shell', 'fc.renderer.header', NULL, '{}'::text[], '{}'::jsonb),

  ('*', 'foundation-console', 'fc.surface.sidebar.main',
   'sidebar.main', 'sidebar', 0, true, 1,
   'workspace.sidebar', 'shell', 'fc.renderer.sidebar', NULL, '{}'::text[], '{}'::jsonb),

  ('*', 'foundation-console', 'fc.surface.content.main',
   'content.main', 'main', 0, true, 1,
   'workspace.content', 'shell', 'fc.renderer.content', NULL, '{}'::text[], '{}'::jsonb),

  ('*', 'foundation-console', 'fc.surface.main.empty',
   'main.empty', 'main', 10, true, 1,
   'workspace.emptyState', 'visual', 'fc.renderer.emptyState', NULL, '{}'::text[],
   '{"title":"Foundation Console","description":"Runtime is online. Seed pages to populate this area."}'::jsonb)
ON CONFLICT (tenant_id, product_code, surface_id) DO UPDATE
  SET slot_key       = EXCLUDED.slot_key,
      zone           = EXCLUDED.zone,
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

-- ── shell_nav_groups ────────────────────────────────────────────────
INSERT INTO fc_ui_os.shell_nav_groups
  (id, tenant_id, product_code, position, icon, label_i18n_key, label_fallback)
VALUES
  ('fc.nav.group.platform', '*', 'foundation-console', 0,
   NULL, 'fc.nav.group.platform', 'Platform')
ON CONFLICT (tenant_id, product_code, id) DO UPDATE
  SET position       = EXCLUDED.position,
      icon           = EXCLUDED.icon,
      label_i18n_key = EXCLUDED.label_i18n_key,
      label_fallback = EXCLUDED.label_fallback,
      updated_at     = now();

-- ── shell_nav_items ─────────────────────────────────────────────────
-- Item action references the runtime-emitted main surface (no static product route invented).
INSERT INTO fc_ui_os.shell_nav_items
  (id, tenant_id, product_code, group_id, position, icon,
   label_i18n_key, label_fallback, action, perms_required)
VALUES
  ('fc.nav.item.home', '*', 'foundation-console', 'fc.nav.group.platform', 0,
   NULL, 'fc.nav.item.home', 'Home',
   '{"kind":"navigate","path":"/"}'::jsonb, '{}'::text[])
ON CONFLICT (tenant_id, product_code, id) DO UPDATE
  SET group_id       = EXCLUDED.group_id,
      position       = EXCLUDED.position,
      icon           = EXCLUDED.icon,
      label_i18n_key = EXCLUDED.label_i18n_key,
      label_fallback = EXCLUDED.label_fallback,
      action         = EXCLUDED.action,
      perms_required = EXCLUDED.perms_required,
      updated_at     = now();

-- ── Validation ──────────────────────────────────────────────────────
DO $$
DECLARE
  surfaces_count int;
  groups_count int;
  items_count int;
BEGIN
  SELECT count(*) INTO surfaces_count FROM fc_ui_os.workspace_shell_binding
    WHERE tenant_id='*' AND product_code='foundation-console' AND enabled=true;
  SELECT count(*) INTO groups_count FROM fc_ui_os.shell_nav_groups
    WHERE tenant_id='*' AND product_code='foundation-console';
  SELECT count(*) INTO items_count FROM fc_ui_os.shell_nav_items
    WHERE tenant_id='*' AND product_code='foundation-console';
  IF surfaces_count < 4 THEN RAISE EXCEPTION 'F8 seed: surfaces<4 (got %)', surfaces_count; END IF;
  IF groups_count   < 1 THEN RAISE EXCEPTION 'F8 seed: groups<1 (got %)',   groups_count;   END IF;
  IF items_count    < 1 THEN RAISE EXCEPTION 'F8 seed: items<1 (got %)',    items_count;    END IF;
END
$$;

COMMIT;
