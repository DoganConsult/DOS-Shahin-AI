-- =====================================================================
-- 20260514_1500_tenant_shell_completeness_gap_fill.sql
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
--
-- Gap audit (2026-05-14) found two active tenants with incomplete
-- shell data relative to the canonical 54-key chrome set that every
-- other active tenant already has:
--   65f10f855eab8b30  Foundation Probe workspace
--   6caee2135aeb8236  DOS Platform
--
-- These tenants received only the 10 base action chrome keys during
-- earlier provisioning and were missed by subsequent bulk-seed passes.
-- This migration closes every identified gap:
--
--   GAP-1  44 missing chrome keys  (ui_workspace_chrome)
--   GAP-2   4 missing shortcuts    (ui_workspace_shortcut)
--   GAP-3   2 missing policies     (ui_workspace_policy)
--   GAP-4   3 missing module entitlements (tenant_module_entitlements)
--            dynamic-ui | knowledge | marketing
--
-- All operations are idempotent (ON CONFLICT DO UPDATE / DO NOTHING).
-- No destructive ops. Safe re-run.
-- =====================================================================

BEGIN;

-- ─── GAP-1 — Chrome keys ─────────────────────────────────────────────
-- Seed the 44 keys that are present in all 38 well-seeded tenants but
-- absent in the 2 identified tenants. Canonical reference: dogan tenant.
-- Only inserts into the two named tenants. ON CONFLICT updates to ensure
-- value correctness if a partial row already exists.

WITH under_seeded AS (
  SELECT tenant_id FROM dos.tenants
  WHERE tenant_id IN ('65f10f855eab8b30','6caee2135aeb8236')
    AND status = 'active'
),
seeds(chrome_key, value_json) AS (
  VALUES
    -- Brand identity
    ('brand'::text,                          '"Shahin AI"'::jsonb),
    ('workspaceTitle',                       '"Workspace"'::jsonb),
    ('logoHref',                             '"/"'::jsonb),
    -- Account menu (typed ShellAction objects — doctrine-compliant)
    ('accountMenu',
     '[{"id":"profile","enabled":true,"i18nKey":"shell.account.profile","actionType":"navigate","permission":null,"action":{"kind":"navigate","path":"/profile"}},{"id":"settings","enabled":true,"i18nKey":"shell.account.settings","actionType":"navigate","permission":null,"action":{"kind":"navigate","path":"/settings"}},{"id":"language","enabled":true,"i18nKey":"shell.account.language","actionType":"shell.preference","permission":null,"action":{"kind":"toggle_language"}},{"id":"theme","enabled":true,"i18nKey":"shell.account.theme","actionType":"shell.preference","permission":null,"action":{"kind":"toggle_theme"}},{"id":"signout","enabled":true,"i18nKey":"shell.account.signout","actionType":"auth.logout","permission":null,"destructive":true,"action":{"kind":"dispatch_event","eventName":"auth.logout"}}]'::jsonb),
    ('accountMenuActions',
     '[{"id":"toggle-language","action":{"kind":"toggle_language"}},{"id":"toggle-theme","action":{"kind":"toggle_theme"}}]'::jsonb),
    -- Account menu scalar labels
    ('shell.account.language',               '"Language"'::jsonb),
    ('shell.account.profile',                '"Profile"'::jsonb),
    ('shell.account.settings',               '"Settings"'::jsonb),
    ('shell.account.signout',                '"Sign out"'::jsonb),
    ('shell.account.theme',                  '"Theme"'::jsonb),
    -- Action queue
    ('shell.actionQueue.emptyText',          '"No pending actions."'::jsonb),
    ('shell.actionQueue.title',              '"Action Queue"'::jsonb),
    -- Banners
    ('shell.banner.offline.message',         '"Some features are unavailable until the connection is restored."'::jsonb),
    ('shell.banner.offline.title',           '"You''re offline"'::jsonb),
    ('shell.banner.session-expiry.message',  '"You''ll be signed out shortly. Save your work."'::jsonb),
    ('shell.banner.session-expiry.title',    '"Session about to expire"'::jsonb),
    ('shell.banner.trial-expired.message',   '"Upgrade to keep using these modules."'::jsonb),
    ('shell.banner.trial-expired.title',     '"Trial expired"'::jsonb),
    -- Command search
    ('shell.commandSearch.placeholder',      '"Search\u2026"'::jsonb),
    -- Context panel
    ('shell.contextPanel.aiLoadingText',     '"AI insights are loading from the agent context\u2026"'::jsonb),
    ('shell.contextPanel.ariaLabel',         '"Context panel"'::jsonb),
    ('shell.contextPanel.tabLabels',         '{"help":"Help","audit":"Audit","record":"Record","ai-insights":"AI Insights"}'::jsonb),
    -- Desktop sidebar
    ('shell.desktopSidebar.ariaLabel',       '"Primary"'::jsonb),
    -- Module-specific search aria-labels (bilingual)
    ('shell.dos-carbon-search.search.ariaLabel',
     '{"en":"Search","ar":"\u0628\u062d\u062b"}'::jsonb),
    ('shell.foundation-module-audit.search.ariaLabel',
     '{"en":"Search events","ar":"\u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0627\u0644\u0623\u062d\u062f\u0627\u062b"}'::jsonb),
    ('shell.foundation-register.search.ariaLabel',
     '{"en":"Search users","ar":"\u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646"}'::jsonb),
    -- Header labels
    ('shell.header.commandSearch.label',     '"Search (Ctrl+K)"'::jsonb),
    ('shell.header.inbox.label',             '"Inbox"'::jsonb),
    -- Inbox
    ('shell.inbox.unreadLabel',              '"Unread"'::jsonb),
    -- More module search aria-labels (bilingual)
    ('shell.module-audit-trail.search.ariaLabel',
     '{"en":"Search audit trail","ar":"\u0627\u0644\u0628\u062d\u062b \u0641\u064a \u0633\u062c\u0644 \u0627\u0644\u062a\u062f\u0642\u064a\u0642"}'::jsonb),
    ('shell.module-cards.aria-label',        '"Modules"'::jsonb),
    ('shell.module-heatmap.search.ariaLabel',
     '{"en":"Search heatmap items","ar":"\u0627\u0644\u0628\u062d\u062b \u0641\u064a \u0639\u0646\u0627\u0635\u0631 \u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u062d\u0631\u0627\u0631\u0629"}'::jsonb),
    ('shell.module-page-chrome.search.ariaLabel',
     '{"en":"Search audit log","ar":"\u0627\u0644\u0628\u062d\u062b \u0641\u064a \u0633\u062c\u0644 \u0627\u0644\u062a\u062f\u0642\u064a\u0642"}'::jsonb),
    ('shell.module-records.search.ariaLabel',
     '{"en":"Search records","ar":"\u0627\u0644\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0633\u062c\u0644\u0627\u062a"}'::jsonb),
    -- Quick create
    ('shell.quickCreate.fabLabel',           '"Create"'::jsonb),
    ('shell.quickCreate.menuLabel',          '"Create options"'::jsonb),
    -- Sidebar
    ('shell.sidebar.aria-label',             '"Primary navigation"'::jsonb),
    ('shell.sidebar.empty.message',          '"No navigation entries available."'::jsonb),
    ('shell.sidebar.poweredByLabel',         '"Powered by Dogan-AI OS"'::jsonb),
    -- Sidebar nav
    ('shell.sidebarNav.badgeLabel',          '"badge"'::jsonb),
    -- Toast
    ('shell.toast.dismissLabel',             '"dismiss"'::jsonb),
    -- User menu / settings
    ('shell.user-menu.label',                '"Account"'::jsonb),
    ('shell.user-menu.aria-label',           '"Account menu"'::jsonb),
    ('shell.settings.aria-label',            '"Settings"'::jsonb)
)
INSERT INTO dos.ui_workspace_chrome (tenant_id, chrome_key, value_json, enabled, version)
SELECT t.tenant_id, s.chrome_key, s.value_json, true, 1
  FROM under_seeded t
 CROSS JOIN seeds s
ON CONFLICT (tenant_id, chrome_key) DO UPDATE
  SET value_json = EXCLUDED.value_json,
      enabled    = true,
      updated_at = now();

-- ─── GAP-2 — Missing shortcuts ───────────────────────────────────────
-- 4 shortcuts present in all well-seeded tenants but absent in the 2
-- identified tenants. go-home uses "/" (root) not "/workspace-home" so
-- it always resolves regardless of product activation.

WITH under_seeded AS (
  SELECT tenant_id FROM dos.tenants
  WHERE tenant_id IN ('65f10f855eab8b30','6caee2135aeb8236')
    AND status = 'active'
),
shorts(shortcut_id, combo, action_json, when_clause, sort_order) AS (
  VALUES
    ('open-command-palette'::text, 'mod+k'::text, '{"kind":"open_command"}'::jsonb,       NULL::text,         10),
    ('toggle-language',            'mod+l',        '{"kind":"toggle_language"}',            NULL,               20),
    ('go-home',                    'g h',          '{"kind":"navigate","path":"/"}',        'workspace',        30),
    ('close-overlay',              'escape',       '{"kind":"close_overlay"}',              'overlay-open',     40)
)
INSERT INTO dos.ui_workspace_shortcut (tenant_id, shortcut_id, combo, action_json, when_clause, sort_order, enabled, version)
SELECT t.tenant_id, s.shortcut_id, s.combo, s.action_json, s.when_clause, s.sort_order, true, 1
  FROM under_seeded t
 CROSS JOIN shorts s
ON CONFLICT (tenant_id, shortcut_id) DO UPDATE
  SET combo       = EXCLUDED.combo,
      action_json = EXCLUDED.action_json,
      when_clause = EXCLUDED.when_clause,
      sort_order  = EXCLUDED.sort_order,
      enabled     = true,
      updated_at  = now();

-- ─── GAP-3 — Missing policies ────────────────────────────────────────
-- 2 policies present in well-seeded tenants but absent in the 2 tenants.

WITH under_seeded AS (
  SELECT tenant_id FROM dos.tenants
  WHERE tenant_id IN ('65f10f855eab8b30','6caee2135aeb8236')
    AND status = 'active'
),
pols(policy_key, value_json) AS (
  VALUES
    ('layout'::text,        '{"breakpoints":{"desktopMinPx":1056},"mobileBottomNav":{"maxItems":4}}'::jsonb),
    ('sessionExpiry',       '{"dangerMinutes":1,"warningMinutes":5}'::jsonb)
)
INSERT INTO dos.ui_workspace_policy (tenant_id, policy_key, value_json, enabled, version)
SELECT t.tenant_id, p.policy_key, p.value_json, true, 1
  FROM under_seeded t
 CROSS JOIN pols p
ON CONFLICT (tenant_id, policy_key) DO UPDATE
  SET value_json = EXCLUDED.value_json,
      enabled    = true,
      updated_at = now();

-- ─── GAP-4 — Missing module entitlements ─────────────────────────────
-- The 2 tenants have shahin-ai product activation but only 2 of 5
-- canonical shahin-ai module entitlements. Backfill the 3 missing
-- (dynamic-ui, knowledge, marketing) to match the canonical set
-- present in all other 38 active tenants.

INSERT INTO dos.tenant_module_entitlements
  (entitlement_id, tenant_id, product_code, module_code, entitlement_status, source)
SELECT
  md5(t.tenant_id || ':' || m.module_code || ':shahin-ai:gap-fill-1500')::varchar AS entitlement_id,
  t.tenant_id,
  'shahin-ai'  AS product_code,
  m.module_code,
  'active'     AS entitlement_status,
  'platform_dna' AS source
FROM
  dos.tenants t
  CROSS JOIN (VALUES ('dynamic-ui'::text),('knowledge'),('marketing')) AS m(module_code)
WHERE t.tenant_id IN ('65f10f855eab8b30','6caee2135aeb8236')
  AND t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM dos.tenant_module_entitlements e
     WHERE e.tenant_id = t.tenant_id
       AND e.module_code = m.module_code
       AND e.entitlement_status = 'active'
  );

-- ─── Assertions ──────────────────────────────────────────────────────
DO $$
DECLARE
  chrome_54_count_probe INT;
  chrome_54_count_dos   INT;
  shortcut_count_probe  INT;
  shortcut_count_dos    INT;
  policy_count_probe    INT;
  policy_count_dos      INT;
  entitlement_probe     INT;
  entitlement_dos       INT;
BEGIN
  -- Chrome: both tenants must now have all 54 canonical keys
  SELECT COUNT(DISTINCT chrome_key) INTO chrome_54_count_probe
    FROM dos.ui_workspace_chrome
   WHERE tenant_id = '65f10f855eab8b30' AND enabled = true;
  SELECT COUNT(DISTINCT chrome_key) INTO chrome_54_count_dos
    FROM dos.ui_workspace_chrome
   WHERE tenant_id = '6caee2135aeb8236' AND enabled = true;
  IF chrome_54_count_probe < 54 THEN
    RAISE EXCEPTION '65f10f855eab8b30 chrome key count % < 54', chrome_54_count_probe;
  END IF;
  IF chrome_54_count_dos < 54 THEN
    RAISE EXCEPTION '6caee2135aeb8236 chrome key count % < 54', chrome_54_count_dos;
  END IF;

  -- Shortcuts: both tenants must have >= 8 shortcuts
  SELECT COUNT(*) INTO shortcut_count_probe
    FROM dos.ui_workspace_shortcut
   WHERE tenant_id = '65f10f855eab8b30' AND enabled = true;
  SELECT COUNT(*) INTO shortcut_count_dos
    FROM dos.ui_workspace_shortcut
   WHERE tenant_id = '6caee2135aeb8236' AND enabled = true;
  IF shortcut_count_probe < 8 THEN
    RAISE EXCEPTION '65f10f855eab8b30 shortcut count % < 8', shortcut_count_probe;
  END IF;
  IF shortcut_count_dos < 8 THEN
    RAISE EXCEPTION '6caee2135aeb8236 shortcut count % < 8', shortcut_count_dos;
  END IF;

  -- Policies: both tenants must have >= 6 policies
  SELECT COUNT(*) INTO policy_count_probe
    FROM dos.ui_workspace_policy
   WHERE tenant_id = '65f10f855eab8b30' AND enabled = true;
  SELECT COUNT(*) INTO policy_count_dos
    FROM dos.ui_workspace_policy
   WHERE tenant_id = '6caee2135aeb8236' AND enabled = true;
  IF policy_count_probe < 6 THEN
    RAISE EXCEPTION '65f10f855eab8b30 policy count % < 6', policy_count_probe;
  END IF;
  IF policy_count_dos < 6 THEN
    RAISE EXCEPTION '6caee2135aeb8236 policy count % < 6', policy_count_dos;
  END IF;

  -- Entitlements: both tenants must now have all 5 canonical modules
  SELECT COUNT(DISTINCT module_code) INTO entitlement_probe
    FROM dos.tenant_module_entitlements
   WHERE tenant_id = '65f10f855eab8b30'
     AND module_code IN ('audit_trail','dynamic-ui','foundation','knowledge','marketing')
     AND entitlement_status = 'active';
  SELECT COUNT(DISTINCT module_code) INTO entitlement_dos
    FROM dos.tenant_module_entitlements
   WHERE tenant_id = '6caee2135aeb8236'
     AND module_code IN ('audit_trail','dynamic-ui','foundation','knowledge','marketing')
     AND entitlement_status = 'active';
  IF entitlement_probe <> 5 THEN
    RAISE EXCEPTION '65f10f855eab8b30 active module entitlements % <> 5', entitlement_probe;
  END IF;
  IF entitlement_dos <> 5 THEN
    RAISE EXCEPTION '6caee2135aeb8236 active module entitlements % <> 5', entitlement_dos;
  END IF;

END$$;

COMMIT;
