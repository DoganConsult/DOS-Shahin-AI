-- 20260508_0380_workspace_shell_chrome_overlay.sql
-- NAV_AND_ACTION_CONTRACT_PASS — chrome-driven overlay scalars + seed
-- de-hardcoding so the visual shell renders no FE-baked literals.
--
-- Adds (per active tenant):
--   shell.sidebar.aria-label   → "Primary navigation"
--   shell.sidebar.empty.message→ "No navigation entries available."
--   shell.user-menu.label      → "Account"
--   shell.user-menu.aria-label → "Account menu"
--   shell.settings.aria-label  → "Settings"
--
-- Clears hardcoded `props.text` from the shell.brand and
-- shell.workspace-title bindings so the runtime resolver can overlay
-- chrome.brand / chrome.workspaceTitle as the single text source.
--
-- Idempotent.

BEGIN;

-- 1) Per-tenant chrome scalars.
WITH active_tenants AS (
  SELECT DISTINCT b.tenant_id
    FROM dos.workspace_shell_binding b
   WHERE b.enabled = true
), seeds(chrome_key, value_json) AS (
  VALUES
    ('shell.sidebar.aria-label'::text,    '"Primary navigation"'::jsonb),
    ('shell.sidebar.empty.message',       '"No navigation entries available."'::jsonb),
    ('shell.user-menu.label',             '"Account"'::jsonb),
    ('shell.user-menu.aria-label',        '"Account menu"'::jsonb),
    ('shell.settings.aria-label',         '"Settings"'::jsonb)
)
INSERT INTO dos.ui_workspace_chrome (tenant_id, chrome_key, value_json, enabled, version)
SELECT t.tenant_id, s.chrome_key, s.value_json, true, 1
  FROM active_tenants t
 CROSS JOIN seeds s
ON CONFLICT (tenant_id, chrome_key) DO UPDATE
  SET value_json = EXCLUDED.value_json,
      enabled    = true,
      updated_at = now();

-- 2) De-hardcode the brand / workspace-title bindings — drop props.text
--    so the resolver's chrome overlay is the only authoritative source.
UPDATE dos.workspace_shell_binding
   SET props = (props - 'text')
 WHERE component_key IN ('workspace.shell.brand','workspace.shell.workspace-title')
   AND props ? 'text';

COMMIT;
