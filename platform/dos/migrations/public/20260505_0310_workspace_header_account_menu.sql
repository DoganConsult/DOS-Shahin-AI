-- 20260505_0310_workspace_header_account_menu.sql
-- Owner: ui-os-service.
--
-- Phase WS-1 follow-up — seed the dynamic account menu (the "exit / sign-out
-- button" the user expects) on every tenant's `workspace.header` row in
-- `dos.workspace_shell_binding`.
--
-- Background:
--   ShellHostComponent.accountMenuItems() reads from
--   WorkspaceShellBindingService.accountMenuEntries(), which looks up
--   `workspace_shell_binding.props.accountMenu` (array of
--   ShellAccountMenuEntry shapes — see
--   platform/ui-system/dos-ui-contracts/src/nav-contract.ts:117).
--   When the array is missing, the host falls back to the platform default
--   (WorkspaceNavigationAdapter.accountMenuConfig). Until WS-1 was wired in
--   the FE, every tenant row had `props` without the `accountMenu` key,
--   so the dynamic path was inert.
--
-- This migration patches all 40 tenant `workspace.header` rows so the menu
-- includes: Profile · Tenant profile · Settings · Tenant settings (admin
-- only) · Sign out. labelKeys point at i18n bundles already present in
-- products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts.
--
-- Idempotent (`props || jsonb_build_object(...)` overwrites the
-- accountMenu key only).

BEGIN;

UPDATE dos.workspace_shell_binding
   SET props = COALESCE(props, '{}'::jsonb) || jsonb_build_object(
        'accountMenu', jsonb_build_array(
          jsonb_build_object(
            'id',       'profile',
            'labelKey', 'shell.account.menu.profile',
            'route',    '/profile'
          ),
          jsonb_build_object(
            'id',       'tenant-profile',
            'labelKey', 'shell.account.menu.tenant_profile',
            'route',    '/tenant-profile'
          ),
          jsonb_build_object(
            'id',       'settings',
            'labelKey', 'shell.account.menu.settings',
            'route',    '/settings'
          ),
          jsonb_build_object(
            'id',            'tenant-settings',
            'labelKey',      'shell.account.menu.tenant_settings',
            'route',         '/tenant-settings',
            'requiresAdmin', true
          ),
          jsonb_build_object(
            'id',          'logout',
            'labelKey',    'shell.account.menu.logout',
            'route',       '/api/auth/logout',
            'destructive', true
          )
        )
      ),
      version    = version + 1,
      updated_at = now()
 WHERE component_key = 'workspace.header';

COMMIT;
