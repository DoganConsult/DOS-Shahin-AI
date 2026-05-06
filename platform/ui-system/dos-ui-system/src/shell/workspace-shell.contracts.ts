import type { ShellAction } from '@dos/ui-contracts';

export type WorkspaceShellKey = string;
export type WorkspaceRuntimeZone = string;

/**
 * Canonical zone values used by shell-host for zoneHas() gating.
 * DB source: dos.workspace_shell_binding → metadata.zone or props.zone.
 * Known zones: header, sidebar, main, fab, right-rail, bottom-status,
 * mobile-nav, mobile-drawer, toast, top-banners.
 * Extensible via DB without FE release.
 */
export const WORKSPACE_SHELL_ZONES = [
  'header',
  'sidebar',
  'main',
  'top-banners',
  'bottom-status',
  'right-rail',
  'fab',
  'toast',
  'mobile-nav',
  'mobile-drawer',
] as const;

export type WorkspaceKnownRuntimeZone = (typeof WORKSPACE_SHELL_ZONES)[number];

export interface WorkspaceShellCatalogEntry {
  readonly component_key: string;
  readonly carbon_key?: string | null;
  readonly vendor?: string | null;
  readonly schema_version?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>> | null;
  readonly approval_status?: string | null;
  readonly approved_at?: string | null;
  readonly zone?: WorkspaceRuntimeZone | null;
}

const workspaceShellKeySet = new Set<string>();
const workspaceShellCarbonMap = new Map<string, string>();
const workspaceShellCatalog = new Map<string, WorkspaceShellCatalogEntry>();

export const WORKSPACE_SHELL_KEYS: readonly WorkspaceShellKey[] = [];
export const WORKSPACE_SHELL_KEY_COUNT = 0;
export const WORKSPACE_SHELL_CARBON_MAP: Readonly<Record<string, string>> = Object.freeze({});
export const WORKSPACE_SHELL_BANDS: readonly WorkspaceShellBand[] = Object.freeze([]);

export interface WorkspaceShellBand {
  readonly band: string;
  readonly label_en: string;
  readonly label_ar: string;
  readonly keys: readonly WorkspaceShellKey[];
  readonly count: number;
}

export function registerWorkspaceShellCatalog(entries: readonly WorkspaceShellCatalogEntry[]): void {
  workspaceShellKeySet.clear();
  workspaceShellCarbonMap.clear();
  workspaceShellCatalog.clear();
  for (const entry of entries) {
    const key = entry.component_key;
    if (!key) continue;
    workspaceShellKeySet.add(key);
    workspaceShellCatalog.set(key, entry);
    if (entry.carbon_key) workspaceShellCarbonMap.set(key, entry.carbon_key);
  }
}

export function getWorkspaceShellCatalog(): readonly WorkspaceShellCatalogEntry[] {
  return Array.from(workspaceShellCatalog.values());
}

export function getWorkspaceShellKeys(): readonly WorkspaceShellKey[] {
  return Array.from(workspaceShellKeySet.values());
}

export function isWorkspaceShellKey(value: string): value is WorkspaceShellKey {
  return workspaceShellKeySet.has(value);
}

export function assertWorkspaceShellKey(value: string): asserts value is WorkspaceShellKey {
  if (!isWorkspaceShellKey(value)) {
    throw new Error(`Invalid workspace-shell key: '${value}'. The key was not returned by the workspace-shell resolver catalog.`);
  }
}

export function carbonKeyFor(key: string): string | undefined {
  return workspaceShellCarbonMap.get(key);
}

// ── Runtime config types ──────────────────────────────────────────────────

export interface WorkspaceShellActionItem {
  id: string;
  labelKey?: string;
  destructive?: boolean;
  action?: ShellAction;
}

export interface WorkspaceShellBannerTemplate {
  id: string;
  gate?: 'always' | 'trial-expired' | 'offline' | 'session-expiry' | 'impersonation' | 'error' | string;
  kind?: string;
  titleKey?: string;
  messageKey?: string;
  dismissible?: boolean;
  actionLabelKey?: string;
  action?: ShellAction;
}

export interface WorkspaceShellSessionExpiryPolicy {
  warningMinutes?: number;
  dangerMinutes?: number;
}

export interface WorkspaceShellRuntimeLayoutConfig {
  mobileBottomNav?: { maxItems?: number };
  breakpoints?: { largePx?: number };
}

export interface WorkspaceShellRuntimePolicyConfig {
  sessionExpiry?: WorkspaceShellSessionExpiryPolicy;
}

export interface WorkspaceShellRuntimeChromeConfig {
  strings?: Readonly<Record<string, string>>;
  shortcuts?: Readonly<Record<string, string>>;
  accountMenuActions?: readonly WorkspaceShellActionItem[];
}

export interface WorkspaceShellRuntimeConfig {
  chrome?: WorkspaceShellRuntimeChromeConfig;
  layout?: WorkspaceShellRuntimeLayoutConfig;
  policies?: WorkspaceShellRuntimePolicyConfig;
  bannerTemplates?: readonly WorkspaceShellBannerTemplate[];
}

// ── Nav row types (resolver response) ─────────────────────────────────────

export interface WorkspaceRuntimeNavGroupRow {
  module_code: string;
  group_id: string;
  sort_order?: number | null;
  label_key?: string | null;
  label_en?: string | null;
  label_ar?: string | null;
  enabled?: boolean | null;
  version?: number | null;
}

export interface WorkspaceRuntimeNavItemRow {
  module_code: string;
  item_id: string;
  group_id?: string | null;
  sort_order?: number | null;
  route?: string | null;
  icon?: string | null;
  permission?: string | null;
  label_key?: string | null;
  label_en?: string | null;
  label_ar?: string | null;
  badge?: number | string | null;
  enabled?: boolean | null;
  version?: number | null;
}

export interface WorkspaceRuntimeNavigation {
  groups: readonly WorkspaceRuntimeNavGroupRow[];
  items: readonly WorkspaceRuntimeNavItemRow[];
}

// ── Shell surface/binding types ───────────────────────────────────────────

export interface PermissionAware {
  readonly perms_required: readonly string[];
}

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

export interface WorkspaceShellResolverResponse {
  readonly tenantId: string;
  readonly version: number;
  readonly surfaces: readonly WorkspaceShellBindingRow[];
  readonly zones: Readonly<Record<string, readonly WorkspaceShellBindingRow[]>>;
  readonly knownKeys: readonly string[];
  readonly componentRegistry?: readonly WorkspaceShellCatalogEntry[];
}

// ── UI item contracts (all use typed ShellAction) ─────────────────────────

export interface WorkspaceI18nLabel {
  i18nKey: string;
  fallback?: string;
}

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
  action?: ShellAction;
}

export interface WorkspaceNavItem {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  route?: string;
  active?: boolean;
  badge?: number;
  badgeCount?: number;
  permission?: string;
  group?: string;
  action?: ShellAction;
}

export interface StatusBarSignal {
  id: string;
  label: WorkspaceI18nLabel;
  kind?: string;
  level?: string;
  value?: string | number;
  action?: ShellAction;
}

export interface ActionQueueItem {
  id: string;
  title: WorkspaceI18nLabel;
  origin: WorkspaceI18nLabel;
  status?: string;
  severity?: string;
  action?: ShellAction;
  timestamp?: string;
  dueAt?: string;
}

export type AgentActivityState = 'running' | 'complete' | 'done' | 'error' | 'waiting' | 'awaiting-approval' | string;

export interface AgentActivity {
  agentName: WorkspaceI18nLabel;
  step: WorkspaceI18nLabel;
  state?: AgentActivityState;
  status?: AgentActivityState;
  agentId?: string;
  avatarUri?: string;
  action?: ShellAction;
}

export interface CommandSearchResult {
  id: string;
  label: WorkspaceI18nLabel;
  action?: ShellAction;
  icon?: string;
  category: 'route' | 'record' | 'action' | 'agent' | 'help';
  hotkey?: string;
}

export interface ContextPanelView {
  id: string;
  title: WorkspaceI18nLabel;
  emptyMessage?: WorkspaceI18nLabel;
  tab?: string;
}

export type ContextPanelTab = 'record' | 'help' | 'activity' | string;

export type InboxSource = 'system' | 'agent' | 'user' | 'module' | string;
export type InboxPriority = 'low' | 'med' | 'medium' | 'high' | string;

export interface InboxMessage {
  id: string;
  subject: WorkspaceI18nLabel;
  preview: WorkspaceI18nLabel;
  source?: InboxSource;
  priority?: InboxPriority;
  action?: ShellAction;
  read?: boolean;
  unread?: boolean;
  timestamp?: string;
  receivedAt?: string;
}

export interface QuickCreateAction {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  action?: ShellAction;
}

export interface SelectableTileProps { variant?: string; tone?: string; density?: string; }
export interface ClickableTileProps { variant?: string; href?: string; }
export interface ExpandableTileProps { variant?: string; expandedHeight?: string; }
export interface AiTileProps { variant?: string; confidence?: number; }
