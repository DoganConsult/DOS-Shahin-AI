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

export interface WorkflowExecutionContract {
  executionId: string;
  definitionCode: string;
  entityType: string;
  entityId: string;
  state: string;
  currentStep: string | null;
  assigneeId: string | null;
  startedAt: string;
  completedAt: string | null;
  slaDeadline: string | null;
}

export interface WorkflowTransitionContract {
  transitionId: string;
  executionId: string;
  fromStep: string;
  toStep: string;
  action: string;
  performedBy: string;
  performedAt: string;
  decision: 'approved' | 'rejected' | 'skipped' | 'auto';
  comments: string | null;
}

export interface WorkflowApprovalContract {
  approvalId: string;
  executionId: string;
  stepCode: string;
  approverId: string;
  decision: 'approved' | 'rejected' | 'deferred';
  decidedAt: string | null;
  comments: string | null;
  delegatedFrom: string | null;
}

export interface WorkflowDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

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

export interface SlaMetrics {
  totalActive: number;
  totalBreached: number;
  totalWarning: number;
  averageBreachHours: number | null;
}

export interface EscalationRecord {
  escalationId: string;
  instanceId: string;
  stepId: string;
  stepCode: string;
  escalationLevel: number;
  escalatedTo: string;
  reason: string;
  status: 'pending' | 'acknowledged' | 'resolved' | 'expired';
  escalatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

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

export interface VersionRolloutResult {
  definitionId: string;
  previousVersion: number;
  newVersion: number;
  migratedInstanceCount: number;
  failedMigrationCount: number;
  status: 'success' | 'partial' | 'failed';
}

export interface TransitionRule {
  transitionId: string;
  definitionId: string;
  fromStepId: string;
  fromStepCode: string;
  toStepId: string;
  toStepCode: string;
  transitionType: 'sequential' | 'conditional' | 'parallel' | 'fork' | 'join';
  labelEn: string | null;
  priority: number;
  requiresApproval: boolean;
}
