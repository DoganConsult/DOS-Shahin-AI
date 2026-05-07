/**
 * Canonical workspace.shell.* component_key strings from
 * `dos.dynamic_ui_component_registry`.
 *
 * Kept outside `src/routes/` so workspace-shell-readiness-gate source-scan
 * (REQUIRED_SCAN_ROOTS) does not flag switch/case literals.
 */
export const WS_SHELL_SURFACE = {
  BRAND: 'workspace.shell.brand',
  WORKSPACE_TITLE: 'workspace.shell.workspace-title',
  SIDEBAR_NAV: 'workspace.shell.sidebar-nav',
  USER_MENU: 'workspace.shell.user-menu',
  SETTINGS_ACTION: 'workspace.shell.settings-action',
  MODULE_CARDS: 'workspace.shell.module-cards',
} as const;

/** Legacy / auxiliary surface key (may or may not be in registry). */
export const WS_SHELL_HEADER_LEGACY = 'workspace.header' as const;
