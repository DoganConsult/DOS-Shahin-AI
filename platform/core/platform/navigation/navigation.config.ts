import { NavItem, QuickActionItem, ProductOwner } from './navigation.models';

// ═══════════════════════════════════════════════════════════════════════
// UI-OS ONLY NAVIGATION — all nav items come from UI-OS runtime.
//
// Legacy state (archived to <repo>/legacy-archive/):
//   - STATIC_FOUNDATION_NAV_CHILDREN: 20 hardcoded NavItem[]
//   - SHAHIN_NAV: 650+ lines of hardcoded module navigation
//   - PLATFORM_NAV_BOTTOM: nav groups
//   - WIDGET_TO_QUICK_ACTION: hardcoded quick actions
//
// Current state:
//   - DB source: dos.workspace_shell_binding + dos.ui_route_template_binding
//   - API: GET /api/ui-os/workspace-runtime
//   - FE consumer: WorkspaceShellBindingService.navConfig()
// ═══════════════════════════════════════════════════════════════════════

// Empty by default — populated from UI-OS runtime via WorkspaceShellBindingService.
export const PLATFORM_NAV: NavItem[] = [];

// No SHAHIN_NAV — all module nav comes from UI-OS runtime.
export const SHAHIN_NAV: NavItem[] = [];

// No bottom nav — UI-OS runtime-driven.
export const PLATFORM_NAV_BOTTOM: NavItem[] = [];

// Widget-to-quick-action map — empty by default, populated from
// dos.dynamic_ui_widgets at runtime.
export const WIDGET_TO_QUICK_ACTION: Record<string, QuickActionItem> = {};
