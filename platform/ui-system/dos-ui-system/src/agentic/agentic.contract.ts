/**
 * Phase M0.5 — Agentic UI Interaction Contracts.
 *
 * Universal state model + event names + prop shapes for the 10 Dynamic-UI
 * agentic components. Components NEVER execute logic locally — they emit
 * `AgenticEvent`s that workflow / ai-engine services consume.
 *
 * Source-of-truth alignment:
 *   - DB rows: dos.dynamic_ui_component_registry (component_key='agent.*',
 *     vendor='ibm-carbon', approval_status='approved').
 *   - Per-module enrolment: dos.agent_registry + dos.agent_module_binding
 *     (migration 20260503_0025_agent_registry.sql).
 */

/**
 * Universal state contract — every agentic component MUST handle all 9
 * states. CI gate `agentic-ui-coverage.mjs` greps for this enum across
 * each component's source and fails on missing branches.
 */
export const AGENT_STATES = [
  'loading',
  'empty',
  'ready',
  'thinking',
  'running',
  'waiting_approval',
  'blocked',
  'failed',
  'completed',
] as const;
export type AgentState = (typeof AGENT_STATES)[number];

/** Universal event keys emitted by every agentic component. */
export const AGENT_EVENTS = [
  'agent.action.requested',
  'agent.action.approved',
  'agent.action.rejected',
  'agent.task.created',
  'agent.task.completed',
  'agent.evidence.attached',
  'agent.audit.logged',
] as const;
export type AgentEventKey = (typeof AGENT_EVENTS)[number];

export interface AgentEvent<TPayload = unknown> {
  key: AgentEventKey;
  agentId: string;
  occurredAt: string;
  payload?: TPayload;
}

/** Action declaration — pure data. The component never owns the executor. */
export interface AgentAction {
  key: string;
  label: string;
  labelAr?: string;
  /** When true, surfaces the action-approval-modal before emit. */
  requiresApproval?: boolean;
  /** RBAC key — `dos-can-render` style; checked by the host shell. */
  permission?: string;
  /** Visual emphasis. */
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface AgentTaskRef {
  title: string;
  titleAr?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  moduleCode?: string;
  recordId?: string;
  dueAt?: string;
}

/**
 * Recommendation surfaced by `<dos-agent-recommendation-panel>`.
 * Mirrors the prompt's locked schema.
 */
export interface AgentRecommendation {
  id: string;
  agentId: string;
  agentName: string;
  status: AgentState;
  /** 0–1. */
  confidence: number;
  task: AgentTaskRef;
  why?: string;
  whyAr?: string;
  riskImpact?: 'low' | 'medium' | 'high' | 'critical';
  actions: ReadonlyArray<AgentAction>;
  /** Pointer to the evidence row(s) that justify this recommendation. */
  proofReference?: string;
}

/** Strip aggregate — fed to `<dos-agent-status-strip>`. */
export interface AgentStripSummary {
  activeAgents: number;
  runningTasks: number;
  pendingApprovals: number;
  failedActions: number;
  lastRunAt?: string;
  /** Optional per-agent breakdown for the popover view. */
  perAgent?: ReadonlyArray<{ agentId: string; state: AgentState; lastRunAt?: string }>;
}

/** Single agent card record. */
export interface AgentCardModel {
  agentId: string;
  agentCode: string; // A01..A10
  displayName: string;
  displayNameAr?: string;
  role: string;
  state: AgentState;
  /** 0–1 confidence band. */
  confidence?: number;
  lastAction?: string;
  nextSuggestedAction?: AgentAction;
  /** Brand-asset ref kind for the agent tile pictogram (NOT a Carbon icon). */
  brandTileKind?: 'agent-tile';
  brandAssetCode?: string; // 'A01' etc. — resolves through BrandResolverService
}

/** Activity-flow row (one timeline step). */
export interface AgentActivityStep {
  id: string;
  occurredAt: string;
  actor: 'agent' | 'human' | 'system';
  actorId?: string;
  state: AgentState;
  label: string;
  labelAr?: string;
  evidenceRef?: string;
  auditTraceId?: string;
}

/** Task-queue row. */
export interface AgentTaskRow {
  id: string;
  title: string;
  titleAr?: string;
  agentId: string;
  agentName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  state: AgentState;
  ownerId?: string;
  ownerName?: string;
  dueAt?: string;
  requiresApproval: boolean;
}

/** Evidence-drawer row. */
export interface AgentEvidenceRow {
  id: string;
  fileName?: string;
  controlRef?: string;
  auditRowId?: string;
  sourceSystem?: string;
  confidenceReason?: string;
  lastVerifiedAt?: string;
  url?: string;
  mime?: string;
}

/** Approval-modal payload — what the human is being asked to approve. */
export interface AgentApprovalPayload {
  agentId: string;
  agentName: string;
  recommendationId: string;
  whatHappens: string;
  whatHappensAr?: string;
  recordsAffected?: ReadonlyArray<{ moduleCode: string; recordId: string; label?: string }>;
  requestedBy?: string;
  requiredPermission?: string;
  rollbackSupported: boolean;
  auditImpact: 'none' | 'low' | 'medium' | 'high';
}

/** Audit-trail row. */
export interface AgentAuditRow {
  occurredAt: string;
  agentId: string;
  agentName: string;
  action: string;
  decision: 'approved' | 'rejected' | 'auto-executed' | 'failed';
  approverUserId?: string;
  recordChanged?: string;
  evidenceRef?: string;
  traceId: string;
}

/** Master `componentKey` set — keep in lockstep with DB seed migration 0024. */
export const AGENTIC_COMPONENT_KEYS = [
  'agent.status-strip',
  'agent.card',
  'agent.activity-flow',
  'agent.task-queue',
  'agent.recommendation-panel',
  'agent.action-approval-modal',
  'agent.workbench',
  'agent.evidence-drawer',
  'agent.followup-center',
  'agent.audit-trail',
] as const;
export type AgenticComponentKey = (typeof AGENTIC_COMPONENT_KEYS)[number];

export function isAgenticComponentKey(k: unknown): k is AgenticComponentKey {
  return typeof k === 'string' && (AGENTIC_COMPONENT_KEYS as readonly string[]).includes(k);
}
