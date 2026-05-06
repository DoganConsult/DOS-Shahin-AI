-- USER_ACTION_BEHAVIOR_PASS — wire account-menu entries to the canonical
-- shell-host dispatchers. Removes the broken `open_external →
-- /api/auth/logout` redirect (which lands on auth-service's 404
-- "Cannot GET /logout") and replaces it with a typed `dispatch_event`
-- shape that ShellHost catches and routes to AuthLogoutService:
--   POST /api/auth/oidc/logout (cookies cleared by auth-service)
--   AccessStore.clear()
--   router.navigateByUrl('/login')
--
-- Language / theme entries are normalized to the canonical
-- toggle_language / toggle_theme typed actions so ShellHost can route
-- them through ShellPreferencesService (DOM dir/lang + data-carbon-theme).
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
          'action',      jsonb_build_object(
                            'kind','dispatch_event',
                            'eventName','auth.logout'
                          ),
          'enabled',     true,
          'destructive', true,
          'permission',  NULL
        )
       ),
       updated_at = now()
 WHERE c.chrome_key = 'accountMenu';

COMMIT;
