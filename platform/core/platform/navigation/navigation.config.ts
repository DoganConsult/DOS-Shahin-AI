import type { NavItem, QuickActionItem } from './navigation.models';

// ═══════════════════════════════════════════════════════════════════════
// DYNAMIC NAVIGATION — ALL nav comes from UI-OS runtime.
//
// Source of truth: WorkspaceShellBindingService.navConfig()
// API: GET /api/ui-os/workspace-shell/:tenantId → navigation.groups/items
//
// HARD RULE: No static Home, Foundation, or module nav items.
// Empty DB = empty nav (maintenance mode). Not a frontend fallback.
// ═══════════════════════════════════════════════════════════════════════

// All module nav comes from DB via UI-OS runtime.
// These empty arrays are kept only for backwards compile-compat with
// consumers that destructure them (e.g. route guards). They are never
// populated — all runtime nav flows through WorkspaceShellBindingService.
export const PLATFORM_NAV: NavItem[] = [];
export const SHAHIN_NAV: NavItem[] = [];
export const PLATFORM_NAV_BOTTOM: NavItem[] = [];
export const WIDGET_TO_QUICK_ACTION: Record<string, QuickActionItem> = {};
