/**
 * Universal Module Template Types
 * Shared contracts used by all 13 page templates.
 * All modules import from here — never define locally.
 */

// ─── Role-adaptive display ──────────────────────────────────────────────────
export type ModuleRole =
  | 'platform_super_admin' | 'role_platform_super_admin'
  | 'tenant_admin'         | 'role_tenant_owner'
  | 'risk_manager'         | 'role_risk_manager'
  | 'compliance_manager'   | 'compliance_analyst' | 'compliance_auditor'
  | 'foundation_admin'     | 'foundation_operator' | 'foundation_auditor'
  | 'standard_user'
  | string;                // open for new module roles

export type RoleViewMode = 'full' | 'read-only' | 'limited';

export function resolveViewMode(role: ModuleRole, writeRoles: ModuleRole[]): RoleViewMode {
  if (writeRoles.includes(role)) return 'full';
  if (role === 'standard_user') return 'limited';
  return 'read-only';
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
export interface ModuleKpi {
  label: string;
  labelAr?: string;
  value: string | number;
  delta?: string;           // e.g. "+12%"  "-3"
  deltaDirection?: 'up' | 'down' | 'neutral';
  aiInsight?: string;       // shown in ai-label
  status?: 'critical' | 'warning' | 'success' | 'info';
  link?: string;            // navigate on click
}

// ─── Next Best Action ────────────────────────────────────────────────────────
export interface ModuleAction {
  label: string;
  labelAr?: string;
  description?: string;
  aiScore?: number;         // AI priority 0-100
  route?: string;
  action?: () => void;
  permission?: string;      // hide if role lacks this
  severity?: 'critical' | 'warning' | 'info';
}

// ─── Tab definition ──────────────────────────────────────────────────────────
export interface ModuleTab {
  id: string;
  label: string;
  labelAr?: string;
  badge?: number;
  permission?: string;
}

// ─── Table column ────────────────────────────────────────────────────────────
export interface ModuleColumn {
  key: string;
  label: string;
  labelAr?: string;
  sortable?: boolean;
  type?: 'text' | 'tag' | 'progress' | 'ai-score' | 'date' | 'link' | 'actions';
}

// ─── Record row (generic) ───────────────────────────────────────────────────
export interface ModuleRecord {
  id: string;
  [key: string]: unknown;
  _status?: string;
  _severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  _aiScore?: number;
  _aiInsight?: string;
  _progress?: number;       // 0–100
}

// ─── Notification ───────────────────────────────────────────────────────────
export interface ModuleNotification {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  subtitle?: string;
  action?: { label: string; fn: () => void };
}

// ─── Report card ─────────────────────────────────────────────────────────────
export interface ModuleReport {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  status: 'ready' | 'generating' | 'scheduled' | 'failed';
  tag?: string;
  aiGenerated?: boolean;
  lastUpdated?: string;
  downloadUrl?: string;
}

// ─── Settings section ────────────────────────────────────────────────────────
export interface ModuleSettingsSection {
  id: string;
  label: string;
  labelAr?: string;
  icon?: string;
}

// ─── Checklist step (onboarding) ────────────────────────────────────────────
export interface ModuleSetupStep {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  route?: string;
  actionLabel?: string;
}
