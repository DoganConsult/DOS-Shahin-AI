-- Phase Shell-Cutover — baseline seed for the canonical UI-OS workspace
-- envelope so the new dynamic shell renders for every active tenant.
--
-- Tables touched (all idempotent — ON CONFLICT DO NOTHING / DO UPDATE):
--   dos.ui_workspace_chrome    — flat KV per tenant (brand, account menu)
--   dos.ui_workspace_policy    — flat KV per tenant (layout, sessionExpiry)
--   dos.ui_workspace_shortcut  — global keyboard shortcuts
--   dos.ui_workspace_banner    — gated lifecycle banners (offline / trial)
--
-- Seed targets every row in dos.tenants WHERE status='active' (38 today)
-- but is fully idempotent — re-running is a no-op for rows that already
-- carry the canonical key. Updates use ON CONFLICT DO NOTHING so manual
-- per-tenant overrides are preserved.

BEGIN;

-- ── Chrome (per tenant) ─────────────────────────────────────────────────
INSERT INTO dos.ui_workspace_chrome (tenant_id, chrome_key, value_json, enabled, version)
SELECT t.tenant_id, x.chrome_key, x.value_json::jsonb, true, 1
  FROM dos.tenants t
 CROSS JOIN (VALUES
   ('brand',           '"Shahin AI"'),
   ('workspaceTitle',  '"Workspace"'),
   ('logoHref',        '"/"'),
   ('accountMenu',     '[
     {"id":"profile",  "i18nKey":"shell.account.profile",  "action":{"kind":"navigate","path":"/account/profile"}},
     {"id":"settings", "i18nKey":"shell.account.settings", "action":{"kind":"navigate","path":"/account/settings"}},
     {"id":"language", "i18nKey":"shell.account.language", "action":{"kind":"toggle_language"}},
     {"id":"theme",    "i18nKey":"shell.account.theme",    "action":{"kind":"toggle_theme"}},
     {"id":"signout",  "i18nKey":"shell.account.signout",  "action":{"kind":"navigate","path":"/auth/logout"}, "destructive":true}
   ]'),
   ('accountMenuActions', '[
     {"id":"toggle-language", "action":{"kind":"toggle_language"}},
     {"id":"toggle-theme",    "action":{"kind":"toggle_theme"}}
   ]'),
   ('shell.account.profile',  '"Profile"'),
   ('shell.account.settings', '"Settings"'),
   ('shell.account.language', '"Language"'),
   ('shell.account.theme',    '"Theme"'),
   ('shell.account.signout',  '"Sign out"'),
   ('shell.banner.offline.title',         '"You''re offline"'),
   ('shell.banner.offline.message',       '"Some features are unavailable until the connection is restored."'),
   ('shell.banner.session-expiry.title',  '"Session about to expire"'),
   ('shell.banner.session-expiry.message','"You''ll be signed out shortly. Save your work."'),
   ('shell.banner.trial-expired.title',   '"Trial expired"'),
   ('shell.banner.trial-expired.message', '"Upgrade to keep using these modules."')
 ) AS x(chrome_key, value_json)
 WHERE t.status = 'active'
ON CONFLICT (tenant_id, chrome_key) DO NOTHING;

-- ── Policies (per tenant) ───────────────────────────────────────────────
INSERT INTO dos.ui_workspace_policy (tenant_id, policy_key, value_json, enabled, version)
SELECT t.tenant_id, x.policy_key, x.value_json::jsonb, true, 1
  FROM dos.tenants t
 CROSS JOIN (VALUES
   ('sessionExpiry', '{"warningMinutes":5,"dangerMinutes":1}'),
   ('layout',        '{"mobileBottomNav":{"maxItems":4},"breakpoints":{"desktopMinPx":1056}}')
 ) AS x(policy_key, value_json)
 WHERE t.status = 'active'
ON CONFLICT (tenant_id, policy_key) DO NOTHING;

-- ── Shortcuts (per tenant) ──────────────────────────────────────────────
INSERT INTO dos.ui_workspace_shortcut
  (tenant_id, shortcut_id, combo, action_json, when_clause, sort_order, enabled, version)
SELECT t.tenant_id, x.shortcut_id, x.combo, x.action_json::jsonb, x.when_clause, x.sort_order, true, 1
  FROM dos.tenants t
 CROSS JOIN (VALUES
   ('open-command-palette', 'mod+k',   '{"kind":"open_command"}',                                         NULL,           10),
   ('toggle-language',      'mod+l',   '{"kind":"toggle_language"}',                                      NULL,           20),
   ('go-home',              'g h',     '{"kind":"navigate","path":"/"}',                                  'workspace',    30),
   ('close-overlay',        'escape',  '{"kind":"close_overlay"}',                                        'overlay-open', 40)
 ) AS x(shortcut_id, combo, action_json, when_clause, sort_order)
 WHERE t.status = 'active'
ON CONFLICT (tenant_id, shortcut_id) DO NOTHING;

-- ── Banners (per tenant) ────────────────────────────────────────────────
INSERT INTO dos.ui_workspace_banner
  (tenant_id, banner_id, gate, kind, title_key, title_fallback,
   message_key, message_fallback, action_label_key, action_json,
   dismissible, sort_order, enabled, version)
SELECT t.tenant_id, x.banner_id, x.gate, x.kind, x.title_key, x.title_fallback,
       x.message_key, x.message_fallback, x.action_label_key,
       NULLIF(x.action_json,'')::jsonb, x.dismissible, x.sort_order, true, 1
  FROM dos.tenants t
 CROSS JOIN (VALUES
   ('offline',        'offline',        'warning',
    'shell.banner.offline.title',         'You''re offline',
    'shell.banner.offline.message',       'Some features are unavailable until the connection is restored.',
    NULL::text, '', false, 10),
   ('session-expiry', 'session-expiry', 'warning',
    'shell.banner.session-expiry.title',  'Session about to expire',
    'shell.banner.session-expiry.message','You''ll be signed out shortly. Save your work.',
    NULL::text, '', true,  20),
   ('trial-expired',  'trial-expired',  'danger',
    'shell.banner.trial-expired.title',   'Trial expired',
    'shell.banner.trial-expired.message', 'Upgrade to keep using these modules.',
    NULL::text, '', false, 30)
 ) AS x(banner_id, gate, kind,
        title_key,        title_fallback,
        message_key,      message_fallback,
        action_label_key, action_json, dismissible, sort_order)
 WHERE t.status = 'active'
ON CONFLICT (tenant_id, banner_id) DO NOTHING;

-- ── Self-assertions ─────────────────────────────────────────────────────
DO $$
DECLARE
  active_count int;
  chrome_count int;
  policy_count int;
  shortcut_count int;
  banner_count int;
BEGIN
  SELECT count(*) INTO active_count FROM dos.tenants WHERE status='active';
  SELECT count(*) INTO chrome_count   FROM dos.ui_workspace_chrome;
  SELECT count(*) INTO policy_count   FROM dos.ui_workspace_policy;
  SELECT count(*) INTO shortcut_count FROM dos.ui_workspace_shortcut;
  SELECT count(*) INTO banner_count   FROM dos.ui_workspace_banner;

  IF chrome_count   < active_count THEN RAISE EXCEPTION 'chrome seed coverage low: %/%',  chrome_count,   active_count; END IF;
  IF policy_count   < active_count THEN RAISE EXCEPTION 'policy seed coverage low: %/%',  policy_count,   active_count; END IF;
  IF shortcut_count < active_count THEN RAISE EXCEPTION 'shortcut seed coverage low: %/%',shortcut_count, active_count; END IF;
  IF banner_count   < active_count THEN RAISE EXCEPTION 'banner seed coverage low: %/%',  banner_count,   active_count; END IF;
END$$;

COMMIT;
