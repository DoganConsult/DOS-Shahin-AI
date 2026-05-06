-- 20260508_0390_workspace_account_menu_contract.sql
-- NAV_AND_ACTION_CONTRACT_PASS — clean up chrome.accountMenu so every
-- entry references a real route binding (or an explicit non-route
-- typed action). Removes the bogus /account/profile and /account/settings
-- targets — neither has a `ui_route_template_binding` row, so the
-- previous chrome wired the icon-only header button to a 404. Updates:
--
--   profile  → kind=navigate path=/profile          (binding exists)
--   settings → kind=navigate path=/settings         (binding exists)
--   language → kind=toggle_language                 (typed shell action)
--   theme    → kind=toggle_theme                    (typed shell action)
--   signout  → kind=open_external url=/api/auth/logout
--             (canonical gateway endpoint — full-page redirect, not SPA)
--
-- Also adds explicit `actionType` per entry so the FE can render the
-- correct affordance (popover-action vs route vs external) without
-- inferring from `action.kind`.
--
-- Idempotent.

BEGIN;

WITH active_tenants AS (
  SELECT DISTINCT tenant_id
    FROM dos.ui_workspace_chrome
   WHERE chrome_key = 'accountMenu'
)
UPDATE dos.ui_workspace_chrome c
   SET value_json = jsonb_build_array(
        jsonb_build_object(
          'id',         'profile',
          'i18nKey',    'shell.account.profile',
          'actionType', 'navigate',
          'action',     jsonb_build_object('kind','navigate','path','/profile'),
          'enabled',    true,
          'permission', NULL
        ),
        jsonb_build_object(
          'id',         'settings',
          'i18nKey',    'shell.account.settings',
          'actionType', 'navigate',
          'action',     jsonb_build_object('kind','navigate','path','/settings'),
          'enabled',    true,
          'permission', NULL
        ),
        jsonb_build_object(
          'id',         'language',
          'i18nKey',    'shell.account.language',
          'actionType', 'shell.preference',
          'action',     jsonb_build_object('kind','toggle_language'),
          'enabled',    true,
          'permission', NULL
        ),
        jsonb_build_object(
          'id',         'theme',
          'i18nKey',    'shell.account.theme',
          'actionType', 'shell.preference',
          'action',     jsonb_build_object('kind','toggle_theme'),
          'enabled',    true,
          'permission', NULL
        ),
        jsonb_build_object(
          'id',          'signout',
          'i18nKey',     'shell.account.signout',
          'actionType',  'auth.logout',
          'action',      jsonb_build_object('kind','open_external','url','/api/auth/logout'),
          'enabled',     true,
          'destructive', true,
          'permission',  NULL
        )
       ),
       updated_at = now()
 WHERE c.chrome_key = 'accountMenu';

COMMIT;
