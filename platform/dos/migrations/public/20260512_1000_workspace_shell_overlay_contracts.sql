-- =====================================================================
-- 20260512_1000_workspace_shell_overlay_contracts.sql
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / Dynamic UI-OS only.
-- Closes the settings + profile (user-menu) icon gap by introducing
-- 3 DB-driven menu contracts that the resolver projects into typed
-- ShellAction lists. No frontend invention — empty table = empty menu.
--
-- Adds:
--   1) dos.workspace_user_menu_items
--   2) dos.workspace_settings_menu_items
--   3) dos.workspace_global_quick_actions
--   4) Per-tenant default seeds for active tenants (idempotent)
--   5) Typed top-level click contracts on the shell controls themselves:
--      shell.settings.action  = open_context_tab(settings)
--      shell.user-menu.action = open_context_tab(account)
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

-- 1) workspace_user_menu_items
CREATE TABLE IF NOT EXISTS dos.workspace_user_menu_items (
  tenant_id     text        NOT NULL,
  item_id       text        NOT NULL,
  sort_order    integer     NOT NULL DEFAULT 100,
  label_en      text        NOT NULL,
  label_ar      text        NOT NULL,
  icon          text,
  action_json   jsonb       NOT NULL,
  perms_required text[]     NOT NULL DEFAULT ARRAY[]::text[],
  enabled       boolean     NOT NULL DEFAULT true,
  version       integer     NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_workspace_user_menu_items PRIMARY KEY (tenant_id, item_id),
  CONSTRAINT chk_user_menu_action_kind
    CHECK (action_json ? 'kind' AND jsonb_typeof(action_json->'kind') = 'string')
);
CREATE INDEX IF NOT EXISTS idx_user_menu_tenant_sort
  ON dos.workspace_user_menu_items (tenant_id, sort_order);

-- 2) workspace_settings_menu_items
CREATE TABLE IF NOT EXISTS dos.workspace_settings_menu_items (
  tenant_id     text        NOT NULL,
  item_id       text        NOT NULL,
  sort_order    integer     NOT NULL DEFAULT 100,
  label_en      text        NOT NULL,
  label_ar      text        NOT NULL,
  icon          text,
  action_json   jsonb       NOT NULL,
  perms_required text[]     NOT NULL DEFAULT ARRAY[]::text[],
  enabled       boolean     NOT NULL DEFAULT true,
  version       integer     NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_workspace_settings_menu_items PRIMARY KEY (tenant_id, item_id),
  CONSTRAINT chk_settings_menu_action_kind
    CHECK (action_json ? 'kind' AND jsonb_typeof(action_json->'kind') = 'string')
);
CREATE INDEX IF NOT EXISTS idx_settings_menu_tenant_sort
  ON dos.workspace_settings_menu_items (tenant_id, sort_order);

-- 3) workspace_global_quick_actions
CREATE TABLE IF NOT EXISTS dos.workspace_global_quick_actions (
  tenant_id     text        NOT NULL,
  item_id       text        NOT NULL,
  sort_order    integer     NOT NULL DEFAULT 100,
  label_en      text        NOT NULL,
  label_ar      text        NOT NULL,
  icon          text,
  action_json   jsonb       NOT NULL,
  perms_required text[]     NOT NULL DEFAULT ARRAY[]::text[],
  badge         text,
  enabled       boolean     NOT NULL DEFAULT true,
  version       integer     NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_workspace_global_quick_actions PRIMARY KEY (tenant_id, item_id),
  CONSTRAINT chk_global_quick_action_kind
    CHECK (action_json ? 'kind' AND jsonb_typeof(action_json->'kind') = 'string')
);
CREATE INDEX IF NOT EXISTS idx_global_quick_actions_tenant_sort
  ON dos.workspace_global_quick_actions (tenant_id, sort_order);

-- 4) Per-tenant seeds — applied to every ACTIVE tenant via cross join.
WITH active_tenants AS (
  SELECT tenant_id FROM dos.tenants WHERE status='active'
),
user_menu_seed(item_id, sort_order, label_en, label_ar, icon, action_json) AS (
  VALUES
    ('profile',     10, 'Profile',           'الملف الشخصي', 'user',
       '{"kind":"navigate","path":"/account/profile"}'::jsonb),
    ('preferences', 20, 'Preferences',       'التفضيلات',    'settings',
       '{"kind":"navigate","path":"/account/preferences"}'::jsonb),
    ('security',    30, 'Security',          'الأمان',       'shield',
       '{"kind":"navigate","path":"/account/security"}'::jsonb),
    ('language',    40, 'Toggle language',   'تبديل اللغة',  'language',
       '{"kind":"toggle_language"}'::jsonb),
    ('theme',       50, 'Toggle theme',      'تبديل السمة',  'sun',
       '{"kind":"toggle_theme"}'::jsonb),
    ('signout',     90, 'Sign out',          'تسجيل الخروج', 'logout',
       '{"kind":"dispatch_event","eventName":"auth.signout"}'::jsonb)
)
INSERT INTO dos.workspace_user_menu_items
  (tenant_id, item_id, sort_order, label_en, label_ar, icon, action_json)
SELECT t.tenant_id, s.item_id, s.sort_order, s.label_en, s.label_ar, s.icon, s.action_json
  FROM active_tenants t CROSS JOIN user_menu_seed s
ON CONFLICT (tenant_id, item_id) DO UPDATE
  SET sort_order  = EXCLUDED.sort_order,
      label_en    = EXCLUDED.label_en,
      label_ar    = EXCLUDED.label_ar,
      icon        = EXCLUDED.icon,
      action_json = EXCLUDED.action_json,
      enabled     = true,
      updated_at  = now();

WITH active_tenants AS (
  SELECT tenant_id FROM dos.tenants WHERE status='active'
),
settings_seed(item_id, sort_order, label_en, label_ar, icon, action_json) AS (
  VALUES
    ('settings.workspace',   10, 'Workspace settings', 'إعدادات مساحة العمل', 'settings',
       '{"kind":"navigate","path":"/foundation/settings"}'::jsonb),
    ('settings.access',      20, 'Access governance',  'حوكمة الوصول',        'lock',
       '{"kind":"navigate","path":"/foundation/access-review"}'::jsonb),
    ('settings.policies',    30, 'Policies',           'السياسات',            'document',
       '{"kind":"navigate","path":"/foundation/policies"}'::jsonb),
    ('settings.diagnostics', 40, 'Diagnostics',        'التشخيص',             'activity',
       '{"kind":"navigate","path":"/foundation/diagnostics"}'::jsonb),
    ('settings.audit',       50, 'Audit trail',        'سجل التدقيق',         'history',
       '{"kind":"navigate","path":"/foundation/audit"}'::jsonb)
)
INSERT INTO dos.workspace_settings_menu_items
  (tenant_id, item_id, sort_order, label_en, label_ar, icon, action_json)
SELECT t.tenant_id, s.item_id, s.sort_order, s.label_en, s.label_ar, s.icon, s.action_json
  FROM active_tenants t CROSS JOIN settings_seed s
ON CONFLICT (tenant_id, item_id) DO UPDATE
  SET sort_order  = EXCLUDED.sort_order,
      label_en    = EXCLUDED.label_en,
      label_ar    = EXCLUDED.label_ar,
      icon        = EXCLUDED.icon,
      action_json = EXCLUDED.action_json,
      enabled     = true,
      updated_at  = now();

WITH active_tenants AS (
  SELECT tenant_id FROM dos.tenants WHERE status='active'
),
quick_seed(item_id, sort_order, label_en, label_ar, icon, action_json) AS (
  VALUES
    ('command', 10, 'Command palette', 'لوحة الأوامر', 'search',
       '{"kind":"open_command"}'::jsonb),
    ('inbox',   20, 'Inbox',           'صندوق الوارد',  'inbox',
       '{"kind":"open_context_tab","tab":"activity"}'::jsonb),
    ('create',  30, 'Create',          'إنشاء',         'plus',
       '{"kind":"dispatch_event","eventName":"workspace.quickCreate.open"}'::jsonb)
)
INSERT INTO dos.workspace_global_quick_actions
  (tenant_id, item_id, sort_order, label_en, label_ar, icon, action_json)
SELECT t.tenant_id, s.item_id, s.sort_order, s.label_en, s.label_ar, s.icon, s.action_json
  FROM active_tenants t CROSS JOIN quick_seed s
ON CONFLICT (tenant_id, item_id) DO UPDATE
  SET sort_order  = EXCLUDED.sort_order,
      label_en    = EXCLUDED.label_en,
      label_ar    = EXCLUDED.label_ar,
      icon        = EXCLUDED.icon,
      action_json = EXCLUDED.action_json,
      enabled     = true,
      updated_at  = now();

-- 5) Typed top-level click contracts on the shell control surfaces.
WITH active_tenants AS (
  SELECT tenant_id FROM dos.tenants WHERE status='active'
),
chrome_seed(chrome_key, value_json) AS (
  VALUES
    ('shell.settings.action'::text,  '{"kind":"open_context_tab","tab":"settings"}'::jsonb),
    ('shell.user-menu.action'::text, '{"kind":"open_context_tab","tab":"account"}'::jsonb)
)
INSERT INTO dos.ui_workspace_chrome (tenant_id, chrome_key, value_json, enabled, version)
SELECT t.tenant_id, s.chrome_key, s.value_json, true, 1
  FROM active_tenants t CROSS JOIN chrome_seed s
ON CONFLICT (tenant_id, chrome_key) DO UPDATE
  SET value_json = EXCLUDED.value_json,
      enabled    = true,
      updated_at = now();

-- Self-test
DO $$
DECLARE n_um int; n_sm int; n_qa int; n_ck int;
BEGIN
  SELECT count(*) INTO n_um FROM dos.workspace_user_menu_items;
  SELECT count(*) INTO n_sm FROM dos.workspace_settings_menu_items;
  SELECT count(*) INTO n_qa FROM dos.workspace_global_quick_actions;
  SELECT count(*) INTO n_ck FROM dos.ui_workspace_chrome
   WHERE chrome_key IN ('shell.settings.action','shell.user-menu.action')
     AND value_json ? 'kind';
  IF n_um = 0 OR n_sm = 0 OR n_qa = 0 OR n_ck = 0 THEN
    RAISE EXCEPTION 'shell-overlay-contracts: empty seed (um=% sm=% qa=% ck=%)', n_um, n_sm, n_qa, n_ck;
  END IF;
  RAISE NOTICE 'shell-overlay-contracts: user_menu=% settings_menu=% quick_actions=% chrome_actions=%',
    n_um, n_sm, n_qa, n_ck;
END $$;

COMMIT;
