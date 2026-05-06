import type { ShellAction } from './shell-action.contract.js';
/**
 * Workspace navigation contract — Dos-prefixed types.
 *
 * Companion to NavigationItemContract / NavigationContract (data-shape
 * for module-owned routes/perms in `navigation-contract.ts`). The Dos*
 * types here are the runtime/UI surface consumed by `DosWorkspaceNav`,
 * `DosNavSection`, `DosNavItem`. Product navigation adapters in
 * downstream apps (e.g. Shahin) MUST output `DosNavGroup[]` shaped here
 * — the UI components do not accept ad-hoc shapes.
 *
 * Why a parallel surface:
 *   - `NavigationItemContract` is for canonical module manifests
 *     (modules/<module>/contracts/navigation/...).
 *   - `DosNavItem` adds runtime concerns (active, enabled, disabledReason,
 *     badge, group label) that don't belong in static contracts.
 *   - Adapters (product layer) join the two: read manifests + access state,
 *     return DosNavGroup[].
 */
export type DosNavDisabledReason = 'not-entitled' | 'missing-permission' | 'backend-offline' | 'route-not-wired' | 'coming-soon' | 'trial-expired' | 'trial-limit-reached';
export interface DosNavItem {
    /** Stable id; used for tracking, telemetry, and routerLinkActive. */
    id: string;
    /** i18n key. When present, takes precedence over `label` at render time. */
    labelKey?: string;
    /** Plain English fallback label (also acts as default if no i18n). */
    label: string;
    /** Angular route. May be omitted for items that are pure group placeholders. */
    route?: string;
    /** Icon name (canonical icon system: lucide / material-icons-outlined). */
    icon?: string;
    /** Optional badge text (e.g. "soon", "3", "new"). */
    badge?: string;
    /**
     * Permission code required for visibility. Adapters apply this filter
     * BEFORE handing items to UI; the UI itself does not re-check perms.
     */
    requiredPermission?: string;
    /**
     * Module entitlement code (CanonicalModuleCode). Adapters filter against
     * AccessStore.modules() / WorkspaceAccessService.modules().
     */
    moduleCode?: string;
    /**
     * When false, the item renders as visible-but-disabled with no route
     * navigation. Always provide `disabledReason` so the UI can surface
     * a tooltip/badge explaining why.
     */
    enabled: boolean;
    /** Why the item is disabled (drives badge + a11y tooltip). */
    disabledReason?: DosNavDisabledReason;
    /**
     * Optional explicit grouping override. When omitted, the item inherits
     * the parent `DosNavGroup.id`.
     */
    group?: string;
    /** Optional nested children (e.g. Foundation sub-pages). */
    children?: DosNavItem[];
}
export interface DosNavGroup {
    /** Stable id. */
    id: string;
    /** i18n key for the group header. */
    labelKey?: string;
    /** Plain English fallback label. */
    label: string;
    /** Optional sort order; lower = earlier. */
    order?: number;
    /** Items in this group (already permission/entitlement filtered by adapter). */
    items: DosNavItem[];
}
/**
 * Aggregate shape consumed by DosWorkspaceNav. Adapters return this; UI
 * components don't fetch their own data.
 */
export interface DosShellNavConfig {
    groups: DosNavGroup[];
}
/**
 * Account-menu entry shape. Labels resolve from `labelKey` via the host's
 * I18nService at render time; rows with `requiresAdmin: true` are filtered
 * by the host against AccessStore.isTenantAdmin().
 */
export interface ShellAccountMenuEntry {
    id: string;
    labelKey: string;
    /** Legacy navigate — prefer `action`. Normalized at ingest when absent. */
    route?: string;
    /** UI-OS typed action (preferred over `route`). */
    action?: ShellAction;
    destructive?: boolean;
    requiresAdmin?: boolean;
}
/**
 * High-level workspace shell config. Optional — apps may use DosWorkspaceNav
 * directly without a full shell config. Provided for products that want a
 * single declarative input to DosWorkspaceShell.
 */
export interface DosWorkspaceShellConfig {
    workspaceTitle: string;
    workspaceTitleKey?: string;
    nav: DosShellNavConfig;
    /** Items shown in the desktop account-menu popover / mobile bottom sheet. */
    accountMenuItems?: ReadonlyArray<{
        id: string;
        label: string;
        labelKey?: string;
        icon?: string;
        destructive?: boolean;
    }>;
    /** Contract-driven account menu (preferred over `accountMenuItems`). */
    accountMenu?: ReadonlyArray<ShellAccountMenuEntry>;
    /** Routes elevated to the mobile bottom nav (max ~4). */
    mobileBottomNavItemIds?: ReadonlyArray<string>;
}
