import type { ShellAction } from '@dos/ui-contracts';

export type WorkspaceShellKey = string;

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
export type WorkspaceRuntimeZone = WorkspaceKnownRuntimeZone | (string & {});
export type WorkspaceShellZone = WorkspaceRuntimeZone;

export interface WorkspaceShellCatalogEntry {
  readonly componentKey: string;
  readonly carbonKey?: string | null;
  readonly vendor?: string | null;
  readonly schemaVersion?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>> | null;
  readonly approvalStatus?: string | null;
  readonly approvedAt?: string | null;
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
  readonly label: string;
  readonly keys: readonly WorkspaceShellKey[];
  readonly count: number;
}

export function registerWorkspaceShellCatalog(entries: readonly WorkspaceShellCatalogEntry[]): void {
  workspaceShellKeySet.clear();
  workspaceShellCarbonMap.clear();
  workspaceShellCatalog.clear();
  for (const entry of entries) {
    const key = entry.componentKey;
    if (!key) continue;
    workspaceShellKeySet.add(key);
    workspaceShellCatalog.set(key, entry);
    if (entry.carbonKey) workspaceShellCarbonMap.set(key, entry.carbonKey);
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

export interface WorkspaceShellActionItem {
  id: string;
  destructive?: boolean;
  action?: ShellAction;
}

export interface WorkspaceShellShortcut {
  combo: string;
  action: ShellAction;
  when?: string;
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
  mobileBottomNav?: {
    maxItems?: number;
  };
  breakpoints?: {
    desktopMinPx?: number;
  };
}

export interface WorkspaceShellRuntimePolicyConfig {
  sessionExpiry?: WorkspaceShellSessionExpiryPolicy;
}

export interface WorkspaceShellRuntimeChromeConfig {
  labels?: Readonly<Record<string, string>>;
  routes?: Readonly<Record<string, string>>;
  titleTemplate?: string;
  shortcuts?: readonly WorkspaceShellShortcut[];
  accountMenuActions?: readonly WorkspaceShellActionItem[];
}

export interface WorkspaceShellRuntimeConfig {
  chrome?: WorkspaceShellRuntimeChromeConfig;
  layout?: WorkspaceShellRuntimeLayoutConfig;
  policies?: WorkspaceShellRuntimePolicyConfig;
  banners?: readonly WorkspaceShellBannerTemplate[];
}

/** UI-OS runtime nav label — no DB fields. */
export interface WorkspaceI18nLabel {
  label?: string;
  i18nKey?: string;
  fallback?: string;
}

/** Nav group as emitted by UI-OS resolver (camelCase only). */
export interface WorkspaceRuntimeNavGroupRow {
  moduleCode: string;
  groupId: string;
  sortOrder?: number | null;
  /** Pre-resolved display label from UI-OS resolver. */
  label?: string;
  /** i18n key for client-side translation override. */
  i18nKey?: string | null;
  /** English fallback when i18n lookup misses. */
  fallback?: string | null;
  enabled?: boolean | null;
  version?: number | null;
}

/** Nav item as emitted by UI-OS resolver (camelCase only). */
export interface WorkspaceRuntimeNavItemRow {
  moduleCode: string;
  itemId: string;
  groupId?: string | null;
  sortOrder?: number | null;
  action?: ShellAction | null;
  icon?: string | null;
  permission?: string | null;
  /** Pre-resolved display label from UI-OS resolver. */
  label?: string;
  /** i18n key for client-side translation override. */
  i18nKey?: string | null;
  /** English fallback when i18n lookup misses. */
  fallback?: string | null;
  badge?: number | string | null;
  enabled?: boolean | null;
  version?: number | null;
}

export interface WorkspaceRuntimeNavigation {
  groups: readonly WorkspaceRuntimeNavGroupRow[];
  items: readonly WorkspaceRuntimeNavItemRow[];
}

/** Surface binding row — camelCase only, no DB DTOs. */
export interface WorkspaceShellBindingRow {
  readonly componentKey: string;
  readonly carbonKey?: string;
  readonly enabled: boolean;
  readonly position: number;
  readonly permsRequired: readonly string[];
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
  badgeCount?: number;
  action?: ShellAction;
}

export interface WorkspaceNavItem {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  action?: ShellAction;
  active?: boolean;
  badge?: number;
  badgeCount?: number;
  group?: string;
  permission?: string;
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
  timestamp?: string;
  dueAt?: string;
  action?: ShellAction;
}

export type AgentActivityState = 'running' | 'complete' | 'done' | 'error' | 'waiting' | 'awaiting-approval' | string;

export interface AgentActivity {
  agentId?: string;
  avatarUri?: string;
  agentName: WorkspaceI18nLabel;
  step: WorkspaceI18nLabel;
  state?: AgentActivityState;
  status?: AgentActivityState;
  action?: ShellAction;
}

export interface CommandSearchResult {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  category?: string;
  action?: ShellAction;
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
  read?: boolean;
  unread?: boolean;
  timestamp?: string;
  receivedAt?: string;
  action?: ShellAction;
}

export interface QuickCreateAction {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  hotkey?: string;
  action?: ShellAction;
}

export interface SelectableTileProps { variant?: string; tone?: string; density?: string; }
export interface ClickableTileProps { variant?: string; href?: string; }
export interface ExpandableTileProps { variant?: string; expandedHeight?: string; }
export interface AiTileProps { variant?: string; confidence?: number; }
