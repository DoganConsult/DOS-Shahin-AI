// workspace-shell.contracts.ts — 60-key workspace-shell taxonomy.
//
// Source of truth for the FE contract surface. Every key listed here MUST:
//   1. Exist in workspace-shell-complete-direct-seed.json (parity guard)
//   2. Exist in dos.dynamic_ui_component_registry (vendor='ibm-carbon')
//   3. Exist in dos.workspace_shell_binding per tenant
//   4. Be consumed by a runtime renderer (parity guard:
//      scripts/ci-guards/workspace-shell-binding-renderer-parity.mjs)
//
// Six bands: A (Frame 14), B (Navigation/Layout 10), C (Tables/Lists 7),
//            D (Search/Filters/Inputs 12), E (Actions/Feedback/Overlays 7),
//            F (Enterprise Polish 10).
// Total: 14 + 10 + 7 + 12 + 7 + 10 = 60.
//
// Carbon keys use the canonical underscore format matching
// dos.ui_carbon_components (e.g. data_table, combo_box, text_input).

// ─── Band A: Workspace Shell Frame (14) ────────────────────────────────────
export const BAND_A_FRAME_KEYS = [
  'workspace.frame.ui-shell',
  'workspace.frame.header',
  'workspace.frame.header-name',
  'workspace.frame.header-navigation',
  'workspace.frame.header-menu',
  'workspace.frame.header-menu-item',
  'workspace.frame.header-global-bar',
  'workspace.frame.header-global-action',
  'workspace.frame.side-nav',
  'workspace.frame.side-nav-items',
  'workspace.frame.side-nav-menu',
  'workspace.frame.side-nav-menu-item',
  'workspace.frame.side-nav-link',
  'workspace.frame.content',
] as const;

export type BandAFrameKey = typeof BAND_A_FRAME_KEYS[number];

// ─── Band B: Workspace Navigation / Layout (10) ────────────────────────────
export const BAND_B_NAVIGATION_KEYS = [
  'workspace.nav.grid',
  'workspace.nav.column',
  'workspace.nav.layer',
  'workspace.nav.breadcrumb',
  'workspace.nav.tabs',
  'workspace.nav.tab',
  'workspace.nav.tile',
  'workspace.nav.clickable-tile',
  'workspace.nav.expandable-tile',
  'workspace.nav.tag',
] as const;

export type BandBNavigationKey = typeof BAND_B_NAVIGATION_KEYS[number];

// ─── Band C: Workspace Tables / Lists / Data (7) ──────────────────────────
export const BAND_C_DATA_KEYS = [
  'workspace.data.data-table',
  'workspace.data.table-toolbar',
  'workspace.data.table-toolbar-search',
  'workspace.data.table-toolbar-actions',
  'workspace.data.table-batch-actions',
  'workspace.data.pagination',
  'workspace.data.structured-list',
] as const;

export type BandCDataKey = typeof BAND_C_DATA_KEYS[number];

// ─── Band D: Workspace Search / Filters / Inputs (12) ─────────────────────
export const BAND_D_INPUT_KEYS = [
  'workspace.input.search',
  'workspace.input.dropdown',
  'workspace.input.combo-box',
  'workspace.input.multi-select',
  'workspace.input.date-picker',
  'workspace.input.text-input',
  'workspace.input.text-area',
  'workspace.input.number-input',
  'workspace.input.select',
  'workspace.input.checkbox',
  'workspace.input.radio',
  'workspace.input.toggle',
] as const;

export type BandDInputKey = typeof BAND_D_INPUT_KEYS[number];

// ─── Band E: Workspace Actions / Feedback / Overlays (7) ──────────────────
export const BAND_E_ACTION_KEYS = [
  'workspace.action.button',
  'workspace.action.icon-button',
  'workspace.action.overflow-menu',
  'workspace.action.overflow-menu-option',
  'workspace.action.modal',
  'workspace.action.inline-notification',
  'workspace.action.toast-notification',
] as const;

export type BandEActionKey = typeof BAND_E_ACTION_KEYS[number];

// ─── Band F: Enterprise Polish (10) ───────────────────────────────────────
export const BAND_F_POLISH_KEYS = [
  'workspace.polish.tooltip',
  'workspace.polish.toggletip',
  'workspace.polish.popover',
  'workspace.polish.progress-bar',
  'workspace.polish.inline-loading',
  'workspace.polish.skeleton-text',
  'workspace.polish.skeleton-placeholder',
  'workspace.polish.context-menu',
  'workspace.polish.file-uploader',
  'workspace.polish.accordion',
] as const;

export type BandFPolishKey = typeof BAND_F_POLISH_KEYS[number];

// ─── Aggregate: all 60 workspace-shell keys ───────────────────────────────
export const WORKSPACE_SHELL_KEYS = [
  ...BAND_A_FRAME_KEYS,
  ...BAND_B_NAVIGATION_KEYS,
  ...BAND_C_DATA_KEYS,
  ...BAND_D_INPUT_KEYS,
  ...BAND_E_ACTION_KEYS,
  ...BAND_F_POLISH_KEYS,
] as const;

export type WorkspaceShellKey = typeof WORKSPACE_SHELL_KEYS[number];

/**
 * Total count of workspace-shell keys. CI guards assert this number.
 * 14 + 10 + 7 + 12 + 7 + 10 = 60.
 */
export const WORKSPACE_SHELL_KEY_COUNT = 60 as const;

// ─── Carbon key mapping ───────────────────────────────────────────────────
// Maps each workspace-shell component_key to its verified carbon_key in
// dos.ui_carbon_components (underscore format, all runtime_status='active').

export const WORKSPACE_SHELL_CARBON_MAP: Readonly<Record<WorkspaceShellKey, string>> = {
  // Band A — Frame (14)
  'workspace.frame.ui-shell':            'ui_shell',
  'workspace.frame.header':              'header',
  'workspace.frame.header-name':         'header_name',
  'workspace.frame.header-navigation':   'header_navigation',
  'workspace.frame.header-menu':         'header_menu',
  'workspace.frame.header-menu-item':    'header_menu_item',
  'workspace.frame.header-global-bar':   'header_global_bar',
  'workspace.frame.header-global-action':'header_global_action',
  'workspace.frame.side-nav':            'side_nav',
  'workspace.frame.side-nav-items':      'side_nav_items',
  'workspace.frame.side-nav-menu':       'side_nav_menu',
  'workspace.frame.side-nav-menu-item':  'side_nav_menu_item',
  'workspace.frame.side-nav-link':       'side_nav_link',
  'workspace.frame.content':             'content',

  // Band B — Navigation / Layout (10)
  'workspace.nav.grid':                  'grid',
  'workspace.nav.column':                'column',
  'workspace.nav.layer':                 'layer',
  'workspace.nav.breadcrumb':            'breadcrumb',
  'workspace.nav.tabs':                  'tabs',
  'workspace.nav.tab':                   'tab',
  'workspace.nav.tile':                  'tile',
  'workspace.nav.clickable-tile':        'clickable_tile',
  'workspace.nav.expandable-tile':       'expandable_tile',
  'workspace.nav.tag':                   'tag',

  // Band C — Tables / Lists / Data (7)
  'workspace.data.data-table':           'data_table',
  'workspace.data.table-toolbar':        'table_toolbar',
  'workspace.data.table-toolbar-search': 'table_toolbar_search',
  'workspace.data.table-toolbar-actions':'table_toolbar_actions',
  'workspace.data.table-batch-actions':  'table_batch_actions',
  'workspace.data.pagination':           'pagination',
  'workspace.data.structured-list':      'structured_list',

  // Band D — Search / Filters / Inputs (12)
  'workspace.input.search':              'search',
  'workspace.input.dropdown':            'dropdown',
  'workspace.input.combo-box':           'combo_box',
  'workspace.input.multi-select':        'multi_select',
  'workspace.input.date-picker':         'date_picker',
  'workspace.input.text-input':          'text_input',
  'workspace.input.text-area':           'text_area',
  'workspace.input.number-input':        'number_input',
  'workspace.input.select':              'select',
  'workspace.input.checkbox':            'checkbox',
  'workspace.input.radio':               'radio',
  'workspace.input.toggle':              'toggle',

  // Band E — Actions / Feedback / Overlays (7)
  'workspace.action.button':             'button',
  'workspace.action.icon-button':        'icon_button',
  'workspace.action.overflow-menu':      'overflow_menu',
  'workspace.action.overflow-menu-option':'overflow_menu_option',
  'workspace.action.modal':              'modal',
  'workspace.action.inline-notification':'inline_notification',
  'workspace.action.toast-notification': 'toast_notification',

  // Band F — Enterprise Polish (10)
  'workspace.polish.tooltip':            'tooltip',
  'workspace.polish.toggletip':          'toggletip',
  'workspace.polish.popover':            'popover',
  'workspace.polish.progress-bar':       'progress_bar',
  'workspace.polish.inline-loading':     'inline_loading',
  'workspace.polish.skeleton-text':      'skeleton_text',
  'workspace.polish.skeleton-placeholder':'skeleton_placeholder',
  'workspace.polish.context-menu':       'context_menu',
  'workspace.polish.file-uploader':      'file_uploader',
  'workspace.polish.accordion':          'accordion',
};

// ─── Band metadata ────────────────────────────────────────────────────────
export interface WorkspaceShellBand {
  readonly band: string;
  readonly label_en: string;
  readonly label_ar: string;
  readonly keys: readonly WorkspaceShellKey[];
  readonly count: number;
}

export const WORKSPACE_SHELL_BANDS: readonly WorkspaceShellBand[] = [
  { band: 'A', label_en: 'Workspace Shell Frame',                label_ar: 'إطار مساحة العمل',         keys: BAND_A_FRAME_KEYS,       count: 14 },
  { band: 'B', label_en: 'Workspace Navigation / Layout',        label_ar: 'التنقل والتخطيط',          keys: BAND_B_NAVIGATION_KEYS,  count: 10 },
  { band: 'C', label_en: 'Workspace Tables / Lists / Data',      label_ar: 'الجداول والقوائم والبيانات', keys: BAND_C_DATA_KEYS,        count: 7  },
  { band: 'D', label_en: 'Workspace Search / Filters / Inputs',  label_ar: 'البحث والفلاتر والمدخلات',  keys: BAND_D_INPUT_KEYS,       count: 12 },
  { band: 'E', label_en: 'Workspace Actions / Feedback / Overlays', label_ar: 'الإجراءات والتنبيهات',   keys: BAND_E_ACTION_KEYS,      count: 7  },
  { band: 'F', label_en: 'Enterprise Polish',                    label_ar: 'تحسينات المؤسسة',           keys: BAND_F_POLISH_KEYS,      count: 10 },
];

// ─── Runtime zone mapping ─────────────────────────────────────────────────
// Zone determines WHERE in the shell layout a surface renders.
// Frame-band primitives map to specific zones; lower bands are zone-agnostic
// (they appear wherever their parent composition places them).

/**
 * Zone names are fully resolver-driven. The set is sourced from
 * `dos.dynamic_ui_component_registry.metadata.zone` (migration
 * 20260505_2000) and overridable per-tenant via
 * `dos.workspace_shell_binding.props.zone`. There is no closed enum or
 * static fallback map — the resolver alone owns zone assignment.
 */
export type WorkspaceRuntimeZone = string;

// ─── Permission-awareness ─────────────────────────────────────────────────
export interface PermissionAware {
  readonly perms_required: readonly string[];
}

// ─── Binding row contract ─────────────────────────────────────────────────
export interface WorkspaceShellBindingRow {
  readonly component_key: string;
  readonly carbon_key?: string;
  readonly enabled: boolean;
  readonly position: number;
  readonly perms_required: readonly string[];
  readonly props: Readonly<Record<string, unknown>>;
  readonly version: number;
  readonly zone?: WorkspaceRuntimeZone;
}

// ─── Resolver response ───────────────────────────────────────────────────
export interface WorkspaceShellResolverResponse {
  readonly tenantId: string;
  readonly version: number;
  readonly surfaces: readonly WorkspaceShellBindingRow[];
  readonly zones: Readonly<Record<string, readonly WorkspaceShellBindingRow[]>>;
  readonly knownKeys: readonly string[];
}

// ─── Type guards ─────────────────────────────────────────────────────────
const WORKSPACE_SHELL_KEY_SET = new Set<string>(WORKSPACE_SHELL_KEYS);

export function isWorkspaceShellKey(value: string): value is WorkspaceShellKey {
  return WORKSPACE_SHELL_KEY_SET.has(value);
}

export function assertWorkspaceShellKey(value: string): asserts value is WorkspaceShellKey {
  if (!isWorkspaceShellKey(value)) {
    throw new Error(`Invalid workspace-shell key: '${value}'. Expected one of ${WORKSPACE_SHELL_KEY_COUNT} keys.`);
  }
}

/**
 * Resolve the canonical carbon_key for any component_key.
 * Returns undefined for unknown keys (caller must fail preflight, not silently fallback).
 */
export function carbonKeyFor(key: string): string | undefined {
  return (WORKSPACE_SHELL_CARBON_MAP as Record<string, string>)[key];
}

// ─── Data-shape contracts for shell wrapper components ───────────────────
// These define the data shapes that individual shell wrapper components
// consume via their @Input() bindings. They are independent from the
// 60-key taxonomy above (which defines component_key → carbon_key mapping).

export interface WorkspaceI18nLabel {
  i18nKey: string;
  fallback?: string;
}

/** workspace-header props */
export interface WorkspaceHeaderContext {
  brand?: { productName?: string; tenantName?: string; logoHref?: string; logoUri?: string };
  tenantName?: string;
  homeRoute?: string;
  workspaceTitle?: string;
  user?: { displayName?: string; email?: string; avatarUri?: string; avatarUrl?: string };
  trailingActions?: WorkspaceHeaderAction[];
}

export interface WorkspaceHeaderAction {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  ariaLabel?: string;
}

/** workspace-sidebar nav item */
export interface WorkspaceNavItem {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  route?: string;
  active?: boolean;
  badge?: number;
  group?: string;
}

/** workspace-status-bar signal */
export interface StatusBarSignal {
  id: string;
  label: WorkspaceI18nLabel;
  kind?: string;
  level?: string;
  value?: string | number;
  detailRoute?: string;
}

/** workspace-action-queue item */
export interface ActionQueueItem {
  id: string;
  title: WorkspaceI18nLabel;
  origin: WorkspaceI18nLabel;
  status?: string;
  severity?: string;
  route?: string;
  timestamp?: string;
  dueAt?: string;
}

/** agent-activity-strip activity */
export type AgentActivityState = 'running' | 'complete' | 'done' | 'error' | 'waiting' | 'awaiting-approval' | string;

export interface AgentActivity {
  agentName: WorkspaceI18nLabel;
  step: WorkspaceI18nLabel;
  state?: AgentActivityState;
  status?: AgentActivityState;
  evidenceUri?: string;
}

/** command-search result */
export interface CommandSearchResult {
  id: string;
  label: WorkspaceI18nLabel;
  route?: string;
  icon?: string;
  category?: string;
}

/** context-panel view */
export interface ContextPanelView {
  id: string;
  title: WorkspaceI18nLabel;
  emptyMessage?: WorkspaceI18nLabel;
  tab?: string;
}

export type ContextPanelTab = 'record' | 'help' | 'activity' | string;

/** inbox-center message */
export type InboxSource = 'system' | 'agent' | 'user' | 'module' | string;
export type InboxPriority = 'low' | 'med' | 'medium' | 'high' | string;

export interface InboxMessage {
  id: string;
  subject: WorkspaceI18nLabel;
  preview: WorkspaceI18nLabel;
  source?: InboxSource;
  priority?: InboxPriority;
  route?: string;
  read?: boolean;
  unread?: boolean;
  timestamp?: string;
}

/** quick-create action */
export interface QuickCreateAction {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  route?: string;
}

/** Tile variant props (for workspace.nav.tile/clickable-tile/expandable-tile) */
export interface SelectableTileProps { variant?: string; tone?: string; density?: string; }
export interface ClickableTileProps { variant?: string; href?: string; }
export interface ExpandableTileProps { variant?: string; expandedHeight?: string; }
export interface AiTileProps { variant?: string; confidence?: number; }

