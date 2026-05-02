/**
 * Workflow Module — Canonical API Contracts
 * MP-02 §6: Required contracts for definition, execution, transition, approval decision,
 * execution history, diagnostics, and versioning.
 *
 * Law 3: Data-driven — contracts are typed, registered, and consumed by routes/services.
 * Law 9: Concern-organized — not mixed with DTOs or internal types.
 */

// ── Definition Registry Contracts ────────────────────────────────────────────

export interface WorkflowDefinitionContract {
  definitionId: string;
  code: string;
  version: number;
  nameEn: string;
  nameAr: string | null;
  moduleCode: string;
  entityType: string;
  triggerType: 'manual' | 'event' | 'schedule' | 'condition';
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  stepCount: number;
  transitionCount: number;
  slaHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDefinitionCreateInput {
  code: string;
  nameEn: string;
  nameAr?: string;
  moduleCode: string;
  entityType: string;
  triggerType: 'manual' | 'event' | 'schedule' | 'condition';
  slaHours?: number;
  steps: WorkflowStepInput[];
  transitions: WorkflowTransitionInput[];
}

export interface WorkflowStepInput {
  code: string;
  nameEn: string;
  nameAr?: string;
  stepType: 'task' | 'approval' | 'gateway' | 'notification' | 'script';
  isStart?: boolean;
  isEnd?: boolean;
  sequenceOrder: number;
  slaHours?: number;
  config?: Record<string, unknown>;
}

export interface WorkflowTransitionInput {
  fromStepCode: string;
  toStepCode: string;
  transitionType: 'sequential' | 'conditional' | 'parallel' | 'fork' | 'join';
  labelEn?: string;
  priority?: number;
}

// ── Execution Contracts ───────────────────────────────────────────────────────

export interface WorkflowExecutionContract {
  instanceId: string;
  definitionId: string;
  definitionCode: string;
  tenantId: string;
  moduleCode: string;
  entityType: string;
  entityId: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'suspended';
  currentStepId: string | null;
  currentStepCode: string | null;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface WorkflowStartRequest {
  definitionId: string;
  entityType?: string;
  entityId?: string;
  moduleCode?: string;
  context?: Record<string, unknown>;
  triggeredBy: string;
}

export interface WorkflowStartResult {
  instanceId: string;
  definitionId: string;
  currentStepId: string;
  status: string;
  taskId?: string;
}

// ── Transition Contracts ──────────────────────────────────────────────────────

export interface TransitionRequest {
  instanceId: string;
  fromStepId: string;
  outcome?: string;
  moduleCode?: string;
  entityType?: string;
  entityId?: string;
  userRoles?: string[];
  ownerId?: string;
  context?: Record<string, unknown>;
}

export interface TransitionDecision {
  instanceId: string;
  previousStepId: string;
  nextStepId: string | null;
  instanceComplete: boolean;
  taskId?: string;
  status: string;
  upcomingStepId?: string | null;
  lifecycleAuthResult?: {
    allowed: boolean;
    reason: string;
  };
}

// ── Approval Decision Contracts ───────────────────────────────────────────────

export interface ApprovalDecisionRequest {
  approvalId: string;
  tenantId: string;
  decision: 'approved' | 'rejected' | 'delegated';
  approverId: string;
  comments?: string;
  delegateTo?: string;
  requestValue?: number;
}

export interface ApprovalDecisionResult {
  approvalId: string;
  decision: 'approved' | 'rejected' | 'delegated';
  entityType: string;
  entityId: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  currentStep: number;
  totalSteps: number;
  sodResult?: {
    passed: boolean;
    violations: string[];
  };
}

// ── Execution History Contracts ───────────────────────────────────────────────

export interface ExecutionHistoryEntry {
  instanceId: string;
  eventType: string;
  stepId: string | null;
  stepCode: string | null;
  triggeredBy: string;
  previousState: string | null;
  newState: string | null;
  payload: Record<string, unknown> | null;
  occurredAt: string;
}

export interface ExecutionHistoryContract {
  instanceId: string;
  definitionId: string;
  definitionCode: string;
  status: string;
  entries: ExecutionHistoryEntry[];
  totalEntries: number;
}

// ── SLA Contracts ─────────────────────────────────────────────────────────────

export interface SlaStatusContract {
  instanceId: string;
  stepId: string;
  stepCode: string;
  slaHours: number | null;
  dueAt: string | null;
  isBreached: boolean;
  isWarning: boolean;
  hoursRemaining: number | null;
  escalationAction: Record<string, unknown> | null;
}

// ── Diagnostics Contracts ─────────────────────────────────────────────────────

export interface WorkflowDiagnosticsContract {
  tenantId: string;
  activeInstances: number;
  stuckInstances: number;
  failedInstances: number;
  pendingApprovals: number;
  slaBreaches: number;
  averageCompletionHours: number | null;
  capturedAt: string;
}

export interface StuckExecutionRecord {
  instanceId: string;
  definitionId: string;
  definitionCode: string;
  currentStepId: string;
  currentStepCode: string | null;
  status: string;
  stuckSinceMinutes: number;
  isOverdue: boolean;
  triggeredBy: string;
  startedAt: string;
}

export interface TransitionFailureDiagnostic {
  instanceId: string;
  fromStepId: string;
  reason: string;
  deniedBy: 'lifecycle_auth' | 'sod' | 'approval_required' | 'condition_mismatch' | 'engine_error';
  moduleCode: string;
  entityType: string;
  occurredAt: string;
}

// ── Version Rollout Contracts ─────────────────────────────────────────────────

export interface WorkflowVersionContract {
  definitionId: string;
  code: string;
  version: number;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  promotedAt: string | null;
  promotedBy: string | null;
  activeInstanceCount: number;
  changeNotes: string | null;
}

export interface VersionRolloutRequest {
  definitionId: string;
  targetVersion: number;
  migrateActiveInstances: boolean;
  notes?: string;
}

export interface VersionRolloutResult {
  definitionId: string;
  previousVersion: number;
  newVersion: number;
  migratedInstanceCount: number;
  failedMigrationCount: number;
  status: 'success' | 'partial' | 'failed';
}
