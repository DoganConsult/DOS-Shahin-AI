/**
 * Phase WS-1 — Workspace-shell typed contracts.
 *
 * One source-of-truth for the 10 workspace-shell surfaces' input shapes.
 * Mirrors the `workspace.*` rows in `dos.dynamic_ui_component_registry`
 * registered by 20260504_0010_workspace_shell_registry.sql and the
 * per-tenant binding rows in `dos.workspace_shell_binding`.
 *
 * Carbon-only contract: every surface composes IBM Carbon primitives
 * (header / side-nav / tile / search / tag / modal / accordion / button).
 *
 * RTL-safe: contracts use logical concepts (start/end, leading/trailing).
 * Permission-aware: every item carries an optional `permission` predicate.
 * i18n-first: every label is keyed by `i18nKey` (en/ar resolved at render).
 */

export type WorkspaceLoadingState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export interface WorkspaceI18nLabel {
  i18nKey: string;
  fallback?: string;
}

export interface PermissionAware {
  permission?: string;          // dot-notation perm ('inbox.read', 'records.create')
  permissions?: string[];       // OR-set; any one grants access
}

// ── 1. dos-workspace-header ────────────────────────────────────────────────
export interface WorkspaceHeaderContext extends PermissionAware {
  tenantId: string;
  tenantName: WorkspaceI18nLabel;
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

export interface WorkspaceHeaderAction extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  href?: string;
  badgeCount?: number;
}

// ── 2. dos-workspace-sidebar ───────────────────────────────────────────────
export interface WorkspaceNavItem extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  route?: string;
  badgeCount?: number;
  active?: boolean;
  children?: WorkspaceNavItem[];
  group?: string;
}

// ── 3. dos-mobile-bottom-nav ───────────────────────────────────────────────
export interface BottomNavItem extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  route?: string;
  active?: boolean;
  badgeCount?: number;
}

// ── 4. dos-command-search ──────────────────────────────────────────────────
export interface CommandSearchResult extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  category: 'route' | 'record' | 'action' | 'agent' | 'help';
  route?: string;
  actionId?: string;
  icon?: string;
  score?: number;
}

// ── 5. dos-workspace-status-bar ────────────────────────────────────────────
export interface StatusBarSignal {
  id: string;
  label: WorkspaceI18nLabel;
  level: 'ok' | 'info' | 'warn' | 'error' | 'critical';
  value?: string;
  detailRoute?: string;
}

// ── 6. dos-action-queue (shell variant) ────────────────────────────────────
export interface ActionQueueItem extends PermissionAware {
  id: string;
  title: WorkspaceI18nLabel;
  origin?: WorkspaceI18nLabel;
  dueAt?: string;        // ISO
  severity?: 'low' | 'med' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'overdue' | 'done';
  route?: string;
}

// ── 7. dos-agent-activity-strip ────────────────────────────────────────────
export interface AgentActivity extends PermissionAware {
  id: string;
  agentId: string;
  agentName: WorkspaceI18nLabel;
  step: WorkspaceI18nLabel;
  state: 'idle' | 'running' | 'awaiting-approval' | 'done' | 'error';
  startedAt?: string;
  evidenceUri?: string;
}

// ── 8. dos-inbox-center ────────────────────────────────────────────────────
export interface InboxMessage extends PermissionAware {
  id: string;
  subject: WorkspaceI18nLabel;
  preview?: WorkspaceI18nLabel;
  source: 'notification' | 'inbox' | 'system' | 'agent';
  receivedAt: string;     // ISO
  unread?: boolean;
  route?: string;
  priority?: 'low' | 'med' | 'high';
}

// ── 9. dos-context-panel ───────────────────────────────────────────────────
export type ContextPanelTab = 'record' | 'help' | 'audit' | 'ai-insights';

export interface ContextPanelView extends PermissionAware {
  tab: ContextPanelTab;
  title: WorkspaceI18nLabel;
  emptyMessage?: WorkspaceI18nLabel;
  loading?: boolean;
  payload?: Record<string, unknown>;
}

// ── 10. dos-quick-create ───────────────────────────────────────────────────
export interface QuickCreateAction extends PermissionAware {
  id: string;
  label: WorkspaceI18nLabel;
  icon?: string;
  archetype?: string;     // canonical archetype to launch into (e.g. 'guided-create')
  route?: string;
  hotkey?: string;
}

// ─── Shell binding row (mirrors dos.workspace_shell_binding) ───────────────
export interface WorkspaceShellBindingRow {
  tenant_id: string;
  component_key:
    | 'workspace.header'
    | 'workspace.sidebar'
    | 'workspace.mobile-nav'
    | 'workspace.command-search'
    | 'workspace.status-bar'
    | 'workspace.action-queue'
    | 'workspace.agent-strip'
    | 'workspace.inbox-center'
    | 'workspace.context-panel'
    | 'workspace.quick-create';
  enabled: boolean;
  position: number;
  perms_required: string[];
  props: Record<string, unknown>;
  version: number;
}

export const WORKSPACE_SHELL_KEYS = [
  'workspace.header',
  'workspace.sidebar',
  'workspace.mobile-nav',
  'workspace.command-search',
  'workspace.status-bar',
  'workspace.action-queue',
  'workspace.agent-strip',
  'workspace.inbox-center',
  'workspace.context-panel',
  'workspace.quick-create',
] as const;

export type WorkspaceShellKey = typeof WORKSPACE_SHELL_KEYS[number];
