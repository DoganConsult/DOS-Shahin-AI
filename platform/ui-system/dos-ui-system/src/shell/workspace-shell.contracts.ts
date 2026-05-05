export type WorkspaceShellKey = string;
export type WorkspaceRuntimeZone = string;

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
}

export interface WorkspaceNavItem {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  route?: string;
  active?: boolean;
  badge?: number;
  group?: string;
}

export interface StatusBarSignal {
  id: string;
  label: WorkspaceI18nLabel;
  kind?: string;
  level?: string;
  value?: string | number;
  detailRoute?: string;
}

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

export type AgentActivityState = 'running' | 'complete' | 'done' | 'error' | 'waiting' | 'awaiting-approval' | string;

export interface AgentActivity {
  agentName: WorkspaceI18nLabel;
  step: WorkspaceI18nLabel;
  state?: AgentActivityState;
  status?: AgentActivityState;
  evidenceUri?: string;
}

export interface CommandSearchResult {
  id: string;
  label: WorkspaceI18nLabel;
  route?: string;
  icon?: string;
  category?: string;
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
  route?: string;
  read?: boolean;
  unread?: boolean;
  timestamp?: string;
}

export interface QuickCreateAction {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  route?: string;
}

export interface SelectableTileProps { variant?: string; tone?: string; density?: string; }
export interface ClickableTileProps { variant?: string; href?: string; }
export interface ExpandableTileProps { variant?: string; expandedHeight?: string; }
export interface AiTileProps { variant?: string; confidence?: number; }
