export type AgentStatus = 'idle' | 'active' | 'paused' | 'error' | 'terminated' | string;
export interface AgentMetrics { tasksCompleted?: number; tasksAssigned?: number; avgResponseTimeMs?: number; errorRate?: number; lastActiveAt?: string; [k: string]: unknown; }
export function VALID_AGENT_TRANSITIONS(_from: string, _to: string): boolean { return true; }
export interface SquadMember { agentId?: string; role?: string; status?: AgentStatus; capabilities?: string[]; [k: string]: unknown; }
export type DeploymentMode = 'standalone' | 'squad' | 'pipeline' | string;
export type ParticipantStatus = 'active' | 'standby' | 'removed' | string;
export type InterventionType = 'override' | 'escalation' | 'correction' | 'approval' | string;
export interface InterventionAuditEntry { interventionId?: string; type?: InterventionType; actor?: string; reason?: string; timestamp?: string; entityType?: string; entityId?: string; [k: string]: unknown; }
export interface HandoffContext { fromAgentId?: string; toAgentId?: string; taskId?: string; reason?: string; state?: Record<string, unknown>; [k: string]: unknown; }
export interface HandoffResult { success?: boolean; handoffId?: string; receivedBy?: string; timestamp?: string; [k: string]: unknown; }
export interface AgentDef { id: string; name: string; nameAr: string; domain: string; domainAr: string; icon: string; color: string; moduleCode: string; routePatterns: string[]; delegationScope: string; quickPrompts: { en: string; ar: string }[]; governance: Record<string, unknown>; employee?: AgentEmployeeRecord; }
export interface AgentToolDef { toolName: string; description: string; schema?: unknown; inputSchema?: unknown; [k: string]: unknown; }

/**
 * AgentEmployeeRecord — HR-style metadata that turns an agent definition
 * into a "real employee" record. Treated as canonical source-of-truth for
 * the AI Employees org-chart page (/workspace/hr/ai-employees) and for
 * scheduled-shift seed in dos.ai_workflow_triggers.
 *
 * The platform-agnostic AgentDef.governance object remains the operational
 * gate (approvalBoundary, maxActionsPerCycle); employee.* is the HR view.
 */
export interface AgentEmployeeRecord {
  /** Display title shown on the org-chart card. */
  jobTitle: string;
  jobTitleAr: string;
  /** Human role that owns this agent — must match a real role_code in the RBAC catalogue. */
  managerRoleCode: string;
  /** Display label for the manager role in EN/AR. */
  managerLabel: string;
  managerLabelAr: string;
  /** One-line scope statement (what this employee is hired to do). */
  missionStatement: string;
  missionStatementAr: string;
  /** Bullet list of in-scope responsibilities. */
  responsibilities: string[];
  /** Bullet list of explicit out-of-scope items (escalates to manager). */
  outOfScope: string[];
  /** Concrete artefacts this employee produces on a cadence. */
  deliverables: AgentDeliverable[];
  /** Quantitative KPIs evaluated by the performance-review engine. */
  kpis: AgentKpi[];
  /** Working schedule — drives dos.ai_workflow_triggers seed. */
  schedule: AgentShift[];
  /** Hire date (ISO) — when this agent first became GA in the platform. */
  hireDate: string;
  /** Probation status — agents start at 'probation' with low approvalBoundary. */
  employmentStatus: 'probation' | 'permanent' | 'on_leave' | 'terminated';
}

export interface AgentDeliverable {
  /** Stable code, e.g. 'weekly_risk_digest' or 'monthly_audit_pack'. */
  code: string;
  title: string;
  titleAr: string;
  /** Cadence in human form ('daily', 'weekly', 'monthly', 'on-demand'). */
  cadence: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand';
  /** Where the artefact lands (e.g. 'manager_inbox', 'audit_trail', 'tenant_dashboard'). */
  destination: string;
}

export interface AgentKpi {
  /** Stable metric code; renders as a column on the perf-review page. */
  code: string;
  label: string;
  labelAr: string;
  /** Target threshold expression evaluated against the metric source. */
  target: string;
  /** Source: 'audit_trail' | 'langfuse' | 'tenant_db' | 'derived'. */
  source: 'audit_trail' | 'langfuse' | 'tenant_db' | 'derived';
  /** Direction of "good" — higher-is-better or lower-is-better. */
  direction: 'higher_is_better' | 'lower_is_better';
}

export interface AgentShift {
  /** Stable handle for the shift, used as the cron trigger ID suffix. */
  code: string;
  /** Cron expression (UTC; the runner converts to tenant locale if shift_local=true). */
  cron: string;
  /** Whether the cron should be evaluated in tenant local time vs UTC. */
  localToTenant: boolean;
  /** What this shift produces (typically maps to a deliverable.code). */
  produces: string;
  /** Whether this shift requires an active tenant context (false = platform-global). */
  perTenant: boolean;
}
