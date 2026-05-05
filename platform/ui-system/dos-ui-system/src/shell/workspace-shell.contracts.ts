/**
 * Workspace-shell typed contracts — Phase WS-2 redesign.
 *
 * SOURCE OF TRUTH (parity-locked, NEVER hand-edited drift):
 *  - Doctrine / taxonomy / append-only discipline:
 *      `platform/ui-system/module_ui_os_contract-pack/workspace-shell-complete-direct-seed.md`
 *  - Executable contract emitted by the module publisher (publish-output for
 *    `dos.dynamic_ui_component_registry`, `dos.workspace_shell_binding`,
 *    `dos.workspace_shell_i18n`, `platform_dauth.permissions`):
 *      `platform/ui-system/module_ui_os_contract-pack/workspace-shell-complete-direct-seed.json`
 *  - Resolver DTOs (DB-driven workspace surface fetch) doctrine:
 *      `platform/ui-system/module_ui_os_contract-pack/workspace-db-driven-rewrite-plan.md`
 *
 * RUNTIME CHAIN (per `.md` §7):
 *   .json contract row
 *   → dos.dynamic_ui_component_registry  (vendor + carbon_key, 30 rows)
 *   → dos.workspace_shell_binding         (tenant + props,    30 rows × N tenants)
 *   → GET /api/ui-os/workspace-shell/:tenantId
 *   → WorkspaceShellBindingService (FE)
 *   → ShellHostComponent <dos-workspace-*> / <dos-shell-*> / <dos-page-*>
 *   → Carbon design tokens
 *   → rendered surface
 *
 * INVARIANTS encoded by this file:
 *   - 30 component_keys across 7 groups (Group 1 4 + Group 2 7 + Group 3 5 +
 *     Group 4 3 + Group 5 2 + Group 6 5 + Group 7 4 = 30).
 *   - 7 permissions in the `workspace.*` long-form namespace.
 *   - 12 vendor-locked Carbon primitive keys (`carbon_key`); no non-Carbon
 *     primitive may render in any shell surface.
 *   - 7 i18n namespaces shipped by the publisher: shell.*, nav.group.*,
 *     nav.item.*, status.*, role.*, common.*, page.*.
 *   - Every label is i18n-keyed; every prop bag is typed; every
 *     `WorkspaceI18nLabel` is fail-soft (string | object | snake-case).
 *
 * NEVER add a literal to this file that is not also present in the .json.
 * Drift is enforced by the publisher (`pnpm module:publish workspace-shell`)
 * which refuses to write rows whose component_key / perm / i18n key is not
 * in the `.json`.
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. COMPONENT KEYS — 7 GROUPS × 30 KEYS (mirror `.json#/components[].component_key`)
// ────────────────────────────────────────────────────────────────────────────

/** Group 1 — Shell Layout Framework (4) */
export const SHELL_LAYOUT_KEYS = [
  'shell.app',
  'shell.desktop',
  'shell.mobile',
  'shell.desktop-sidebar',
] as const;

/** Group 2 — Header & Navigation (7) */
export const HEADER_NAV_KEYS = [
  'workspace.header',
  'workspace.sidebar',
  'workspace.mobile-nav',
  'shell.mobile-drawer',
  'shell.workspace-nav',
  'shell.nav-section',
  'shell.nav-item',
] as const;

/** Group 3 — Global Action Surfaces (5) */
export const GLOBAL_ACTION_KEYS = [
  'workspace.command-search',
  'workspace.inbox-center',
  'workspace.quick-create',
  'workspace.context-panel',
  'shell.account-menu',
] as const;

/** Group 4 — Work Activity & Status (3) */
export const WORK_ACTIVITY_KEYS = [
  'workspace.status-bar',
  'workspace.action-queue',
  'workspace.agent-strip',
] as const;

/** Group 5 — Alerts & Singletons (2) */
export const ALERT_SINGLETON_KEYS = [
  'shell.banner-strip',
  'shell.toast-outlet',
] as const;

/** Group 6 — Page Content Infrastructure (5) */
export const PAGE_INFRA_KEYS = [
  'page.layout',
  'page.masthead',
  'page.header',
  'page.tabs',
  'page.widget-frame',
] as const;

/** Group 7 — Tile Variants (4) */
export const TILE_VARIANT_KEYS = [
  'workspace.selectable-tile',
  'workspace.clickable-tile',
  'workspace.expandable-tile',
  'workspace.ai-tile',
] as const;

/**
 * Flat tuple of all 30 keys in publish order (matches
 * `.json#/seeds[0].rows[].position` ordering).
 */
export const WORKSPACE_SHELL_KEYS = [
  ...SHELL_LAYOUT_KEYS,
  ...HEADER_NAV_KEYS,
  ...GLOBAL_ACTION_KEYS,
  ...WORK_ACTIVITY_KEYS,
  ...ALERT_SINGLETON_KEYS,
  ...PAGE_INFRA_KEYS,
  ...TILE_VARIANT_KEYS,
] as const;

export type WorkspaceShellKey = typeof WORKSPACE_SHELL_KEYS[number];
export type ShellLayoutKey    = typeof SHELL_LAYOUT_KEYS[number];
export type HeaderNavKey      = typeof HEADER_NAV_KEYS[number];
export type GlobalActionKey   = typeof GLOBAL_ACTION_KEYS[number];
export type WorkActivityKey   = typeof WORK_ACTIVITY_KEYS[number];
export type AlertSingletonKey = typeof ALERT_SINGLETON_KEYS[number];
export type PageInfraKey      = typeof PAGE_INFRA_KEYS[number];
export type TileVariantKey    = typeof TILE_VARIANT_KEYS[number];

/** Surface group discriminator (used by render host and validators). */
export type WorkspaceShellGroup =
  | 'shell-layout'
  | 'header-nav'
  | 'global-action'
  | 'work-activity'
  | 'alert-singleton'
  | 'page-infra'
  | 'tile-variant';

/** Map a key to its group. Pure function, no DB lookup. */
export function groupOf(key: WorkspaceShellKey): WorkspaceShellGroup {
  if ((SHELL_LAYOUT_KEYS as readonly string[]).includes(key))    return 'shell-layout';
  if ((HEADER_NAV_KEYS as readonly string[]).includes(key))      return 'header-nav';
  if ((GLOBAL_ACTION_KEYS as readonly string[]).includes(key))   return 'global-action';
  if ((WORK_ACTIVITY_KEYS as readonly string[]).includes(key))   return 'work-activity';
  if ((ALERT_SINGLETON_KEYS as readonly string[]).includes(key)) return 'alert-singleton';
  if ((PAGE_INFRA_KEYS as readonly string[]).includes(key))      return 'page-infra';
  return 'tile-variant';
}

export function isWorkspaceShellKey(v: unknown): v is WorkspaceShellKey {
  return typeof v === 'string' && (WORKSPACE_SHELL_KEYS as readonly string[]).includes(v);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. CARBON VENDOR LOCK — 12 carbon_keys (mirror `.json#/components[].carbon_key`)
// ────────────────────────────────────────────────────────────────────────────

/** Vendor-locked Carbon primitive ids. Any other vendor is rejected at DB
 *  insert time by `trg_carbon_only_runtime`. */
export const CARBON_KEYS = [
  'ui-shell',
  'tiles',
  'search',
  'tag',
  'modal',
  'accordion',
  'button',
  'overflow-menu',
  'notification',
  'grid',
  'breadcrumb',
  'tabs',
] as const;

export type CarbonKey = typeof CARBON_KEYS[number];

export const CARBON_VENDOR = 'ibm-carbon' as const;
export type CarbonVendor = typeof CARBON_VENDOR;

// ────────────────────────────────────────────────────────────────────────────
// 3. PERMISSIONS — 7 codes (mirror `.json#/permissions[].code`)
// ────────────────────────────────────────────────────────────────────────────

export const WORKSPACE_SHELL_PERMS = [
  'workspace.shell.read',
  'workspace.shell.manage',
  'workspace.search.use',
  'workspace.workqueue.read',
  'workspace.agents.observe',
  'workspace.inbox.read',
  'workspace.records.create',
] as const;

export type WorkspaceShellPerm = typeof WORKSPACE_SHELL_PERMS[number];

// ────────────────────────────────────────────────────────────────────────────
// 4. I18N NAMESPACES — 7 (mirror `.md` §2.4)
// ────────────────────────────────────────────────────────────────────────────

export const WORKSPACE_SHELL_I18N_NAMESPACES = [
  'shell',
  'nav.group',
  'nav.item',
  'status',
  'role',
  'common',
  'page',
] as const;

export type WorkspaceShellI18nNamespace = typeof WORKSPACE_SHELL_I18N_NAMESPACES[number];

export const WORKSPACE_SHELL_LOCALES = ['en', 'ar'] as const;
export type WorkspaceShellLocale = typeof WORKSPACE_SHELL_LOCALES[number];

// ────────────────────────────────────────────────────────────────────────────
// 5. CORE PRIMITIVES — i18n label + permission gate
// ────────────────────────────────────────────────────────────────────────────

export type WorkspaceLoadingState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/**
 * Canonical i18n label.
 *  - `i18nKey`  resolves through `dos.workspace_shell_i18n` at render.
 *  - `fallback` is shown when the locale row is missing (dev / pre-seed).
 *
 * Fail-soft: consumers never assume both fields are present. Use
 * `resolveLabel()` to read.
 */
export interface WorkspaceI18nLabel {
  i18nKey: string;
  fallback?: string;
}

/** Permission gate. `permission` (single) and `permissions` (OR-set) coexist. */
export interface PermissionAware {
  permission?: WorkspaceShellPerm | string;
  permissions?: ReadonlyArray<WorkspaceShellPerm | string>;
}

/**
 * Resolve a `WorkspaceI18nLabel` to a plain string for display. Accepts the
 * exact contract object, a bare string (treated as both i18nKey + fallback),
 * snake_case mirror (`*_key` / `*_fallback`), or null/undefined.
 */
export function resolveLabel(
  v: WorkspaceI18nLabel | string | null | undefined,
  resolver?: (i18nKey: string) => string | null,
): string {
  if (v == null) return '';
  if (typeof v === 'string') return resolver?.(v) ?? v;
  const fromI18n = v.i18nKey ? resolver?.(v.i18nKey) ?? null : null;
  return fromI18n ?? v.fallback ?? v.i18nKey ?? '';
}

/**
 * Coerce a raw value into a `WorkspaceI18nLabel`. Mirrors the binding
 * service's runtime shape and snake_case alternates emitted by the
 * publisher (`*_key` / `*_fallback`).
 */
export function coerceI18nLabel(
  raw: unknown,
  fieldHint?: string,
  parent?: Record<string, unknown>,
): WorkspaceI18nLabel {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    return {
      i18nKey:  typeof r['i18nKey']  === 'string' ? (r['i18nKey']  as string) : '',
      fallback: typeof r['fallback'] === 'string' ? (r['fallback'] as string) : undefined,
    };
  }
  if (typeof raw === 'string' && raw.trim()) {
    return { i18nKey: raw, fallback: raw };
  }
  if (parent && fieldHint) {
    const k  = parent[`${fieldHint}_key`];
    const fb = parent[`${fieldHint}_fallback`];
    if (typeof k === 'string' && k.trim()) {
      return { i18nKey: k, fallback: typeof fb === 'string' ? fb : undefined };
    }
  }
  return { i18nKey: '', fallback: undefined };
}

// ────────────────────────────────────────────────────────────────────────────
// 6. SHELL SURFACE INPUT SHAPES — Groups 2–4
//    (mirror per-surface props in `.json#/seeds[0].rows[].props`)
// ────────────────────────────────────────────────────────────────────────────

// ── 6.1 workspace.header (Group 2) ─────────────────────────────────────────
export interface WorkspaceHeaderAction extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  href?: string;
  badgeCount?: number;
}

export interface WorkspaceHeaderContext extends PermissionAware {
  tenantId: string;
  /** May be null between sign-in and tenant resolution; consumers must guard. */
  tenantName?: WorkspaceI18nLabel | null;
  user: {
    id: string;
    displayName: string;
    avatarUri?: string;
    role?: string;
  };
  brand?: { logoUri?: string; productName: WorkspaceI18nLabel };
  trailingActions?: WorkspaceHeaderAction[];
  state?: WorkspaceLoadingState;
}

// ── 6.2 workspace.sidebar / shell.workspace-nav / shell.nav-section /
//        shell.nav-item / workspace.mobile-nav (Group 2) ────────────────────
export interface WorkspaceNavItem extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  route?: string;
  badgeCount?: number;
  active?: boolean;
  children?: WorkspaceNavItem[];
  group?: string;
  /** Disabled-state explanation key; mirrors `shell.nav.disabled.*` in `.json`. */
  disabledReasonKey?:
    | 'shell.nav.disabled.coming_soon'
    | 'shell.nav.disabled.route_not_wired'
    | 'shell.nav.disabled.backend_offline'
    | 'shell.nav.disabled.missing_permission'
    | 'shell.nav.disabled.not_entitled'
    | 'shell.nav.disabled.trial_expired'
    | 'shell.nav.disabled.trial_limit_reached';
}

/** Mobile bottom-nav item (subset of WorkspaceNavItem; no children). */
export type BottomNavItem = Omit<WorkspaceNavItem, 'children' | 'group' | 'disabledReasonKey'>;

// ── 6.3 workspace.command-search (Group 3) ──────────────────────────────────
export const COMMAND_SEARCH_CATEGORIES = ['route', 'record', 'action', 'agent', 'help'] as const;
export type CommandSearchCategory = typeof COMMAND_SEARCH_CATEGORIES[number];

export interface CommandSearchResult extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  category: CommandSearchCategory;
  route?: string;
  actionId?: string;
  icon?: string;
  score?: number;
}

// ── 6.4 workspace.status-bar (Group 4) ──────────────────────────────────────
export const STATUS_LEVELS = ['ok', 'info', 'warn', 'error', 'critical'] as const;
export type StatusLevel = typeof STATUS_LEVELS[number];

export interface StatusBarSignal extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  level: StatusLevel;
  value?: string;
  detailRoute?: string;
  /** Source service producing this signal (e.g. `dnoc-service`). */
  source?: string;
}

// ── 6.5 workspace.action-queue (Group 4) ────────────────────────────────────
export const ACTION_SEVERITIES = ['low', 'med', 'high', 'critical'] as const;
export type ActionSeverity = typeof ACTION_SEVERITIES[number];

export const ACTION_STATUSES = ['pending', 'in-progress', 'overdue', 'done'] as const;
export type ActionStatus = typeof ACTION_STATUSES[number];

export interface ActionQueueItem extends PermissionAware {
  id: string;
  title: WorkspaceI18nLabel;
  origin?: WorkspaceI18nLabel;
  /** ISO-8601 timestamp. */
  dueAt?: string;
  severity?: ActionSeverity;
  status: ActionStatus;
  route?: string;
}

// ── 6.6 workspace.agent-strip (Group 4) ─────────────────────────────────────
export const WORKSPACE_AGENT_STATES = ['idle', 'running', 'awaiting-approval', 'done', 'error'] as const;
export type WorkspaceAgentState = typeof WORKSPACE_AGENT_STATES[number];

export interface AgentActivity extends PermissionAware {
  id: string;
  agentId: string;
  agentName: WorkspaceI18nLabel;
  step: WorkspaceI18nLabel;
  state: WorkspaceAgentState;
  /** ISO-8601 timestamp. */
  startedAt?: string;
  evidenceUri?: string;
  avatarUri?: string;
}

// ── 6.7 workspace.inbox-center (Group 3) ────────────────────────────────────
export const INBOX_SOURCES = ['notification', 'inbox', 'system', 'agent'] as const;
export type InboxSource = typeof INBOX_SOURCES[number];

export const INBOX_PRIORITIES = ['low', 'med', 'high'] as const;
export type InboxPriority = typeof INBOX_PRIORITIES[number];

export interface InboxMessage extends PermissionAware {
  id: string;
  subject: WorkspaceI18nLabel;
  preview?: WorkspaceI18nLabel;
  source: InboxSource;
  /** ISO-8601 timestamp. */
  receivedAt: string;
  unread?: boolean;
  route?: string;
  priority?: InboxPriority;
}

// ── 6.8 workspace.context-panel (Group 3) ───────────────────────────────────
/**
 * Open enum: doctrine ships 4 default tabs but downstream modules may
 * register their own (`record`, `help`, `audit`, `ai-insights` are the
 * publisher-seeded set; the runtime accepts arbitrary string ids).
 */
export type ContextPanelTab = 'record' | 'help' | 'audit' | 'ai-insights' | (string & {});

export const CONTEXT_PANEL_DEFAULT_TABS = ['record', 'help', 'audit', 'ai-insights'] as const;

export interface ContextPanelView extends PermissionAware {
  tab: ContextPanelTab;
  title: WorkspaceI18nLabel;
  emptyMessage?: WorkspaceI18nLabel;
  loading?: boolean;
  payload?: Record<string, unknown>;
}

// ── 6.9 workspace.quick-create (Group 3) ────────────────────────────────────
export const QUICK_CREATE_VARIANTS = ['fab', 'button', 'menu'] as const;
export type QuickCreateVariant = typeof QUICK_CREATE_VARIANTS[number];

export interface QuickCreateAction extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  archetype?: string;
  route?: string;
  hotkey?: string;
}

// ── 6.10 shell.account-menu (Group 3) ───────────────────────────────────────
export interface AccountMenuEntry extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  route?: string;
  icon?: string;
  destructive?: boolean;
  requiresAdmin?: boolean;
}

// ── 6.11 shell.banner-strip (Group 5) ───────────────────────────────────────
export const BANNER_SEVERITIES = ['info', 'success', 'warning', 'danger'] as const;
export type BannerSeverity = typeof BANNER_SEVERITIES[number];

export interface WorkspaceShellBannerSpec extends PermissionAware {
  id: string;
  title: WorkspaceI18nLabel;
  message?: WorkspaceI18nLabel;
  action?: WorkspaceI18nLabel;
  severity: BannerSeverity;
  dismissable?: boolean;
}

// ── 6.12 shell.toast-outlet (Group 5) ───────────────────────────────────────
export const TOAST_POSITIONS = [
  'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center',
] as const;
export type ToastPosition = typeof TOAST_POSITIONS[number];

export interface ToastOutletProps {
  position: ToastPosition;
  maxVisible: number;
  /** Auto-dismiss after this many milliseconds; null for sticky. */
  autoDismissMs: number | null;
}

// ────────────────────────────────────────────────────────────────────────────
// 7. PAGE INFRASTRUCTURE INPUT SHAPES — Group 6 (page.*)
//    These were previously untyped — root cause of the audit-page DOM-order
//    breakage. Mirror `.json#/seeds[0].rows[].props` for page.* keys.
// ────────────────────────────────────────────────────────────────────────────

export const PAGE_LAYOUT_ZONES = ['masthead', 'kpi', 'tabs', 'main', 'context-rail'] as const;
export type PageLayoutZone = typeof PAGE_LAYOUT_ZONES[number];

/** page.layout — canonical multi-zone page frame. */
export interface PageLayoutProps {
  zones: ReadonlyArray<PageLayoutZone>;
  /** Component key (Group 6) that owns the masthead zone. */
  masthead_component: PageInfraKey;
  /** Component key (Group 6) that owns the tabs zone. */
  tabs_component: PageInfraKey;
}

/** page.masthead — hero slot tokens. */
export interface PageMastheadProps {
  /** CSS custom-property token for the gradient (e.g. `--dos-gradient-brand-soft`). */
  gradient_token: `--${string}`;
  mesh_layers: ReadonlyArray<`--${string}`>;
  hairline_visible: boolean;
  hairline_token: `--${string}`;
  eyebrow?: WorkspaceI18nLabel;
  title?: WorkspaceI18nLabel;
  subtitle?: WorkspaceI18nLabel;
}

/** page.header — breadcrumb + skip-link chrome. */
export interface PageHeaderProps {
  breadcrumb_aria_key: string;
  skip_to_main_key: string;
  breadcrumb?: ReadonlyArray<{ label: WorkspaceI18nLabel; route?: string }>;
  title?: WorkspaceI18nLabel;
  actions?: ReadonlyArray<WorkspaceHeaderAction>;
}

/** page.tabs — sourced from `dos.ui_route_tab` per route. */
export interface PageTabsProps {
  /** DB table source (always `'dos.ui_route_tab'` per the publisher seed). */
  source: 'dos.ui_route_tab';
  permission_gated: boolean;
  /** Resolved tabs (filled by the resolver, not the publisher). */
  tabs?: ReadonlyArray<ResolvedRouteTab>;
}

export const WIDGET_FRAME_VARIANTS = ['solid', 'glass', 'gradient', 'aurora', 'minimal'] as const;
export type WidgetFrameVariant = typeof WIDGET_FRAME_VARIANTS[number];

export const WIDGET_FRAME_STATES = ['ready', 'loading', 'error', 'empty'] as const;
export type WidgetFrameState = typeof WIDGET_FRAME_STATES[number];

/** page.widget-frame — chrome wrapper for every dynamic widget. */
export interface PageWidgetFrameProps {
  default_variant: WidgetFrameVariant;
  loading_key: string;
  error_title_key: string;
  empty_title_key: string;
  empty_desc_key: string;
}

// ────────────────────────────────────────────────────────────────────────────
// 8. TILE-VARIANT INPUT SHAPES — Group 7 (workspace.*-tile)
// ────────────────────────────────────────────────────────────────────────────

export const TILE_TONES = ['neutral', 'brand', 'accent', 'success', 'warning', 'danger'] as const;
export type TileTone = typeof TILE_TONES[number];

export interface BaseTileProps extends PermissionAware {
  id: string;
  title: WorkspaceI18nLabel;
  description?: WorkspaceI18nLabel;
  icon?: string;
  tone?: TileTone;
  route?: string;
}

export interface SelectableTileProps extends BaseTileProps {
  selected?: boolean;
  onSelect?: string;
}

export interface ClickableTileProps extends BaseTileProps {
  href?: string;
  external?: boolean;
}

export interface ExpandableTileProps extends BaseTileProps {
  expanded?: boolean;
  expandedContentKey?: string;
}

export interface AiTileProps extends BaseTileProps {
  /** ISO-8601 last-update of the underlying AI signal. */
  lastUpdatedAt?: string;
  confidence?: number;
  cta?: WorkspaceI18nLabel;
  ctaRoute?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// 9. PROPS-BAG → SURFACE TYPE MAP
//    (used by render host and binding service to type-check `row.props`)
// ────────────────────────────────────────────────────────────────────────────

export interface WorkspaceShellSurfacePropsMap {
  // Group 1 — props are infra refs only (no UI render input)
  'shell.app':                { responsive_breakpoint: number; desktop_component: ShellLayoutKey; mobile_component: ShellLayoutKey };
  'shell.desktop':            { sidebar_component: ShellLayoutKey; header_component: HeaderNavKey };
  'shell.mobile':             { drawer_component: HeaderNavKey; header_component: HeaderNavKey; bottom_nav_component: HeaderNavKey };
  'shell.desktop-sidebar':    { collapsible: boolean; rail_width: number; expanded_width: number; nav_component: HeaderNavKey };

  // Group 2 — Header & Navigation
  'workspace.header': {
    i18n_ns: WorkspaceShellI18nNamespace;
    brand_key: string;
    title_key: string;
    home_route: string;
    logoHref?: string;
    trailing_actions: ReadonlyArray<string>;
    account_menu_component: HeaderNavKey | GlobalActionKey;
    /** Optional dynamic account menu seed; resolves through AccountMenuEntry. */
    accountMenu?: ReadonlyArray<AccountMenuEntry>;
  };
  'workspace.sidebar':        { i18n_ns: WorkspaceShellI18nNamespace; aria_key: string; nav_source: string; search_placeholder_key: string; items?: ReadonlyArray<WorkspaceNavItem> };
  'workspace.mobile-nav':     { max_items: number; nav_source: string; aria_key: string; items?: ReadonlyArray<BottomNavItem> };
  'shell.mobile-drawer':      { title_key: string; close_key: string; nav_component: HeaderNavKey };
  'shell.workspace-nav':      { nav_source: string; section_component: HeaderNavKey; item_component: HeaderNavKey };
  'shell.nav-section':        { collapsible: boolean; icon_source: string };
  'shell.nav-item':           { show_badge: boolean; disabled_reason_keys: Record<string, string> };

  // Group 3 — Global Action Surfaces
  'workspace.command-search': {
    placeholder_key: string;
    aria_key: string;
    empty_key: string;
    categories: ReadonlyArray<CommandSearchCategory>;
    mobile_fullscreen: boolean;
    results?: ReadonlyArray<CommandSearchResult>;
  };
  'workspace.inbox-center': {
    title_key: string;
    aria_key: string;
    empty_key: string;
    toggle_key: string;
    source: string;
    mobile_mode: 'drawer' | 'sheet' | 'fullscreen';
    messages?: ReadonlyArray<InboxMessage>;
  };
  'workspace.quick-create': {
    title_key: string;
    aria_key: string;
    fab_glyph_key: string;
    variant: QuickCreateVariant;
    mobile_mode: 'sticky-bottom' | 'inline';
    actions_source: string;
    actions?: ReadonlyArray<QuickCreateAction>;
  };
  'workspace.context-panel': {
    title_key: string;
    tabs: ReadonlyArray<{ id: ContextPanelTab; label_key: string }>;
    views?: ReadonlyArray<ContextPanelView>;
  };
  'shell.account-menu': {
    aria_key: string;
    fallback_key: string;
    initial_fallback_key: string;
    signout_key: string;
    entries: ReadonlyArray<AccountMenuEntry>;
    language_toggle: { en_key: string; ar_key: string };
    theme_toggle: { light_key: string; dark_key: string };
  };

  // Group 4 — Work Activity & Status
  'workspace.status-bar':     { signals: ReadonlyArray<StatusBarSignal | { id: string; label_key: string; source: string }> };
  'workspace.action-queue':   { title_key: string; aria_key: string; empty_key: string; source: string; page_size: number; items?: ReadonlyArray<ActionQueueItem> };
  'workspace.agent-strip':    { title_key: string; empty_key: string; source: string; live_updates: boolean; activities?: ReadonlyArray<AgentActivity> };

  // Group 5 — Alerts & Singletons
  'shell.banner-strip':       { banners: ReadonlyArray<WorkspaceShellBannerSpec | { id: string; title_key: string; message_key?: string; action_key?: string; severity: BannerSeverity }> };
  'shell.toast-outlet':       ToastOutletProps;

  // Group 6 — Page Content Infrastructure
  'page.layout':              PageLayoutProps;
  'page.masthead':            PageMastheadProps;
  'page.header':              PageHeaderProps;
  'page.tabs':                PageTabsProps;
  'page.widget-frame':        PageWidgetFrameProps;

  // Group 7 — Tile Variants
  'workspace.selectable-tile': SelectableTileProps;
  'workspace.clickable-tile':  ClickableTileProps;
  'workspace.expandable-tile': ExpandableTileProps;
  'workspace.ai-tile':         AiTileProps;
}

/** Strongly-typed binding row for a known surface key. */
export type SurfaceProps<K extends WorkspaceShellKey> = WorkspaceShellSurfacePropsMap[K];

// ────────────────────────────────────────────────────────────────────────────
// 10. BINDING ROW (mirrors `dos.workspace_shell_binding`)
// ────────────────────────────────────────────────────────────────────────────

export interface WorkspaceShellBindingRow<K extends WorkspaceShellKey = WorkspaceShellKey> {
  tenant_id: string;
  component_key: K;
  enabled: boolean;
  position: number;
  perms_required: ReadonlyArray<WorkspaceShellPerm | string>;
  props: K extends keyof WorkspaceShellSurfacePropsMap
    ? WorkspaceShellSurfacePropsMap[K]
    : Record<string, unknown>;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceShellBindingPayload {
  tenantId: string;
  version: number;
  surfaces: ReadonlyArray<WorkspaceShellBindingRow>;
  knownKeys?: ReadonlyArray<WorkspaceShellKey>;
}

// ────────────────────────────────────────────────────────────────────────────
// 11. RUNTIME VALIDATORS (cheap, fail-soft, used by the binding service +
//     dynamic-ui-drift gate)
// ────────────────────────────────────────────────────────────────────────────

export interface BindingValidationIssue {
  path: string;
  code:
    | 'unknown_component_key'
    | 'invalid_perm_namespace'
    | 'props_not_object'
    | 'enabled_not_boolean'
    | 'tenant_id_missing'
    | 'position_not_integer';
  message: string;
}

export function validateBindingRow(row: unknown, idx = 0): BindingValidationIssue[] {
  const issues: BindingValidationIssue[] = [];
  if (!row || typeof row !== 'object') {
    issues.push({ path: `surfaces[${idx}]`, code: 'props_not_object', message: 'row is not an object' });
    return issues;
  }
  const r = row as Record<string, unknown>;
  if (typeof r['tenant_id'] !== 'string' || !(r['tenant_id'] as string).trim()) {
    issues.push({ path: `surfaces[${idx}].tenant_id`, code: 'tenant_id_missing', message: 'tenant_id is required' });
  }
  if (!isWorkspaceShellKey(r['component_key'])) {
    issues.push({
      path: `surfaces[${idx}].component_key`,
      code: 'unknown_component_key',
      message: `component_key '${String(r['component_key'])}' not in WORKSPACE_SHELL_KEYS`,
    });
  }
  if (typeof r['enabled'] !== 'boolean') {
    issues.push({ path: `surfaces[${idx}].enabled`, code: 'enabled_not_boolean', message: 'enabled must be boolean' });
  }
  if (typeof r['position'] !== 'number' || !Number.isInteger(r['position'])) {
    issues.push({ path: `surfaces[${idx}].position`, code: 'position_not_integer', message: 'position must be an integer' });
  }
  if (r['props'] !== null && (typeof r['props'] !== 'object' || Array.isArray(r['props']))) {
    issues.push({ path: `surfaces[${idx}].props`, code: 'props_not_object', message: 'props must be an object' });
  }
  const perms = r['perms_required'];
  if (Array.isArray(perms)) {
    for (let i = 0; i < perms.length; i++) {
      const p = perms[i];
      if (typeof p !== 'string' || (!p.startsWith('workspace.') && !(WORKSPACE_SHELL_PERMS as readonly string[]).includes(p))) {
        issues.push({
          path: `surfaces[${idx}].perms_required[${i}]`,
          code: 'invalid_perm_namespace',
          message: `perm '${String(p)}' must use 'workspace.*' namespace`,
        });
      }
    }
  }
  return issues;
}

export function validateBindingPayload(payload: unknown): BindingValidationIssue[] {
  if (!payload || typeof payload !== 'object') {
    return [{ path: '$', code: 'props_not_object', message: 'payload is not an object' }];
  }
  const p = payload as Record<string, unknown>;
  const surfaces = Array.isArray(p['surfaces']) ? (p['surfaces'] as unknown[]) : [];
  const out: BindingValidationIssue[] = [];
  for (let i = 0; i < surfaces.length; i++) out.push(...validateBindingRow(surfaces[i], i));
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// 12. RESOLVER DTOs (Phase WS-DB-2 — see `workspace-db-driven-rewrite-plan.md`)
//    Response shapes for the new `/api/ui-os/workspace-surface/*` endpoints
//    that the WorkspaceResolverService consumes with static-fallback safety.
// ────────────────────────────────────────────────────────────────────────────

export interface DbSetupStep {
  step_key: string;
  label_key: string;
  description_key?: string | null;
  icon?: string | null;
  route?: string | null;
  required_permission?: string | null;
  sort_order: number;
  condition_kind?: string | null;
  condition_payload?: Record<string, unknown> | null;
}

export interface DbQuickAction {
  action_key: string;
  eyebrow_key?: string | null;
  label_key: string;
  description_key?: string | null;
  icon?: string | null;
  route?: string | null;
  required_permission?: string | null;
  sort_order: number;
  variant?: 'solid' | 'gradient' | 'outline' | string;
  tone?: 'neutral' | 'accent' | 'brand' | string;
}

export interface DbAiTip {
  tip_key: string;
  title_key: string;
  body_key?: string | null;
  cta_label_key?: string | null;
  cta_route?: string | null;
  icon?: string | null;
  condition_kind?: string | null;
  condition_payload?: Record<string, unknown> | null;
  priority: number;
  required_permission?: string | null;
}

export interface DbHealthProbe {
  probe_key: string;
  label_key: string;
  endpoint: string;
  ok_threshold: number;
  sort_order: number;
}

export interface DbPageHeader {
  route_key: string;
  variant: 'signature' | 'compact' | 'minimal' | string;
  density: 'comfortable' | 'compact' | string;
  eyebrow_key?: string | null;
  title_key: string;
  subtitle_key?: string | null;
  gradient_token: `--${string}`;
  mesh_layers?: ReadonlyArray<`--${string}`> | null;
  hairline_visible: boolean;
  hairline_token?: `--${string}` | null;
}

export interface DbGridColumn {
  col_key: string;
  label_key: string;
  data_field: string;
  data_kind: 'text' | 'code' | 'number' | 'date' | 'status_pill' | string;
  format_payload?: Record<string, unknown> | null;
  is_sortable: boolean;
  is_filterable: boolean;
  default_sort?: 'asc' | 'desc' | null;
  sort_priority: number;
  align: 'start' | 'center' | 'end';
  is_visible: boolean;
  sort_order: number;
}

export interface DbEmptyState {
  state_key: string;
  title_key: string;
  description_key?: string | null;
  tone: 'info' | 'warning' | 'success' | 'brand' | 'danger' | string;
  illustration?: string | null;
  primary_label_key?: string | null;
  primary_route?: string | null;
  secondary_label_key?: string | null;
  secondary_route?: string | null;
}

export interface ResolvedRouteTab extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  sort_order: number;
}

// ────────────────────────────────────────────────────────────────────────────
// 13. MODULE METADATA (mirror `.json#/module`)
// ────────────────────────────────────────────────────────────────────────────

export const WORKSPACE_SHELL_MODULE = {
  code: 'workspace-shell',
  product_key: 'platform-dna',
  tier: 'platform',
  category: 'platform',
  owner_service: 'ui-os-service',
  /** Bumped on every contract publish; mirrors `.json#/module/version`. */
  version: '2.1.0',
  is_platform_dna: true,
  /** Shell hosts pages; owns no route. */
  route_base: null as null,
} as const;

export type WorkspaceShellModuleMetadata = typeof WORKSPACE_SHELL_MODULE;

// ────────────────────────────────────────────────────────────────────────────
// 14. PARITY ASSERTIONS
//    Hard runtime check the shipped tuples sum to 30 (per `.md` §2.1) and the
//    perm tuple sums to 7 (per `.md` §2.2). Drift here means the file is out
//    of sync with the contract pack — fail loud.
// ────────────────────────────────────────────────────────────────────────────

if (WORKSPACE_SHELL_KEYS.length !== 30) {
  throw new Error(
    `[workspace-shell.contracts] WORKSPACE_SHELL_KEYS expected 30, got ${WORKSPACE_SHELL_KEYS.length}`,
  );
}
if (WORKSPACE_SHELL_PERMS.length !== 7) {
  throw new Error(
    `[workspace-shell.contracts] WORKSPACE_SHELL_PERMS expected 7, got ${WORKSPACE_SHELL_PERMS.length}`,
  );
}
