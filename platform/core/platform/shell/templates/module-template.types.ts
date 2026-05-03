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

// ─── Universal 5-Pillar Insight Contract ────────────────────────────────────
// Every page MUST drive: Information → Decision → Action → Evidence
// These 5 questions must be answerable on every page.
export interface ModuleInsightPillars {
  /** "Risk score dropped 12 pts this week" */
  whatChanged?: string;
  /** "Board review in 8 days — unmitigated critical risks disqualify" */
  whyItMatters?: string;
  /** "3 critical risks have no assigned treatment" */
  riskOrOpportunity?: string;
  /** Drives the primary CTA — what the user should do NOW */
  nextAction?: ModuleAction;
  /** "Based on 47 risk records, 3 assessments, AI model v2.1" */
  evidence?: string;
}

// ─── Canonical 13 Page Archetype Names ──────────────────────────────────────
// Selector → Canonical Name → Story Role
//
// dos-command-home         → Command Home         → Entry + hero metric + AI headline + NBA
// dos-posture-overview     → Posture Overview     → Radar + treemap + maturity landscape
// dos-intelligent-register → Intelligent Register → Searchable entity list + AI score
// dos-risk-landscape       → Risk Landscape       → Heatmap matrix + bubble chart
// dos-workflow-control     → Workflow Control Room → Staged pipeline + assessments
// dos-trend-intelligence   → Trend Intelligence   → Time series + analytics + predictions
// dos-evidence-reports     → Evidence & Reports Hub → Report cards + board pack + AI
// dos-action-queue         → My Action Queue      → AI-ranked tasks by urgency
// dos-module-settings      → Module Control Settings → Tabbed config + role-gated save
// dos-record-story         → 360° Record Story    → Full tearsheet detail + evidence + history
// dos-guided-create        → Guided Create / Edit → Multi-step form tearsheet + AI assist
// dos-ai-advisor           → AI Risk Advisor      → AI insights + predictions + recommendations
// dos-activation-journey   → Activation Journey   → Onboarding checklist + coachmarks

export type PageArchetype =
  | 'command-home'
  | 'posture-overview'
  | 'intelligent-register'
  | 'risk-landscape'
  | 'workflow-control'
  | 'trend-intelligence'
  | 'evidence-reports'
  | 'action-queue'
  | 'module-settings'
  | 'record-story'
  | 'guided-create'
  | 'ai-advisor'
  | 'activation-journey';

