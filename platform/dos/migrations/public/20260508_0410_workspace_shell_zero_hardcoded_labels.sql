-- CARBON_WRAPPER_ZERO_HARDCODED_PASS — move all remaining hardcoded
-- visible labels from Angular shell visual components to DB chrome.
--
-- New chrome keys per active tenant:
--   shell.module-cards.aria-label   → "Modules"
--   shell.header.commandSearch.label→ "Search (Ctrl+K)"
--   shell.header.inbox.label       → "Inbox"
--   shell.sidebar.poweredByLabel   → "Powered by Dogan-AI OS"
--
-- These scalars are read by the enrichVisualShellProps resolver and
-- overlaid onto the props bag for the corresponding visual shell
-- surface binding. The Angular components no longer carry any
-- hardcoded fallback — empty chrome → empty/disabled UI.
--
-- Idempotent.

BEGIN;

WITH active_tenants AS (
  SELECT DISTINCT b.tenant_id
    FROM dos.workspace_shell_binding b
   WHERE b.enabled = true
), seeds(chrome_key, value_json) AS (
  VALUES
    ('shell.module-cards.aria-label'::text,     '"Modules"'::jsonb),
    ('shell.header.commandSearch.label',        '"Search (Ctrl+K)"'::jsonb),
    ('shell.header.inbox.label',                '"Inbox"'::jsonb),
    ('shell.sidebar.poweredByLabel',            '"Powered by Dogan-AI OS"'::jsonb),
    ('shell.commandSearch.placeholder',         '"Search…"'::jsonb),
    ('shell.quickCreate.fabLabel',              '"Create"'::jsonb),
    ('shell.quickCreate.menuLabel',             '"Create options"'::jsonb),
    ('shell.actionQueue.title',                 '"Action Queue"'::jsonb),
    ('shell.actionQueue.emptyText',             '"No pending actions."'::jsonb),
    ('shell.contextPanel.ariaLabel',            '"Context panel"'::jsonb),
    ('shell.contextPanel.tabLabels',            '{"record":"Record","help":"Help","audit":"Audit","ai-insights":"AI Insights"}'::jsonb),
    ('shell.contextPanel.aiLoadingText',        '"AI insights are loading from the agent context…"'::jsonb),
    ('shell.desktopSidebar.ariaLabel',          '"Primary"'::jsonb),
    ('shell.toast.dismissLabel',                '"dismiss"'::jsonb),
    ('shell.inbox.unreadLabel',                 '"Unread"'::jsonb),
    ('shell.sidebarNav.badgeLabel',             '"badge"'::jsonb)
)
INSERT INTO dos.ui_workspace_chrome (tenant_id, chrome_key, value_json, enabled, version)
SELECT t.tenant_id, s.chrome_key, s.value_json, true, 1
  FROM active_tenants t
 CROSS JOIN seeds s
ON CONFLICT (tenant_id, chrome_key) DO UPDATE
  SET value_json = EXCLUDED.value_json,
      enabled    = true,
      updated_at = now();

COMMIT;
