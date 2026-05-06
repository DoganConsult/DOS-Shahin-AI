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

// Catalog cache machinery removed — use the HTTP `/api/ui-os/workspace-shell-catalog`
// endpoint when the catalog is needed (see services/ui-os-service/src/routes/
// workspace-shell.routes.ts). The runtime envelope (/workspace-runtime) does
// not carry catalog rows — it carries only the per-tenant binding.

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
  titleFallback?: string;
  messageKey?: string;
  messageFallback?: string;
  dismissible?: boolean;
  actionLabelKey?: string;
  actionLabelFallback?: string;
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
  /** Nested WorkspaceI18nLabel — UI-OS fills `label.label` from Accept-Language. */
  label?: WorkspaceI18nLabel;
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
  /** Nested WorkspaceI18nLabel — UI-OS fills `label.label` from Accept-Language. */
  label?: WorkspaceI18nLabel;
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
  readonly enabled: boolean;
  readonly position: number;
  readonly props: Readonly<Record<string, unknown>>;
  readonly version: number;
  readonly zone?: WorkspaceRuntimeZone;
  /** Stable surface identifier from resolver (e.g., workspace.header.brand.b123) */
  readonly surfaceId?: string;
  /** Slot key for positioning (e.g., header#0#b123) */
  readonly slotKey?: string;
  /** Component key from registry (e.g., workspace.header) */
  readonly componentKey?: string;
  /** Bucket / structural type (e.g., 'shell-frame', 'action', 'data', 'input', 'nav'). */
  readonly componentType?: string | null;
  /** Hybrid-static renderer key — drives surface-renderer COMPONENT_MAP lookup. */
  readonly rendererKey?: string | null;
  /** Carbon primitive key (e.g., 'ui-shell', 'tile', 'button'). */
  readonly carbonKey?: string | null;
}

/** Shortcut emitted by UI-OS resolver — typed action only. */
export interface WorkspaceRuntimeShortcut {
  readonly id: string;
  readonly combo: string;
  readonly action: ShellAction;
  readonly when?: string;
}

/** Banner emitted by UI-OS resolver — nested i18n labels only. */
export interface WorkspaceRuntimeBanner {
  readonly id: string;
  readonly gate: string;
  readonly kind: 'info' | 'warning' | 'error' | 'success' | 'danger' | string;
  readonly title: WorkspaceI18nLabel;
  readonly message: WorkspaceI18nLabel;
  readonly actionLabel?: WorkspaceI18nLabel;
  readonly action?: ShellAction;
  readonly dismissible: boolean;
  readonly version: number;
}

/** Canonical UI-OS workspace-runtime envelope. Single normalization boundary. */
export interface WorkspaceShellResolverResponse {
  readonly tenantId: string;
  readonly userId: string | null;
  readonly productCode: string;
  readonly version: number;
  readonly shell: {
    readonly version: number;
    readonly surfaces: readonly WorkspaceShellBindingRow[];
    readonly zones: Readonly<Record<string, readonly WorkspaceShellBindingRow[]>>;
    readonly nav: {
      readonly groups: readonly WorkspaceRuntimeNavGroupRow[];
      readonly items: readonly WorkspaceRuntimeNavItemRow[];
    };
    readonly chrome: Readonly<Record<string, unknown>>;
    readonly shortcuts: readonly WorkspaceRuntimeShortcut[];
    readonly banners: readonly WorkspaceRuntimeBanner[];
    readonly policies: Readonly<Record<string, unknown>>;
  };
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
