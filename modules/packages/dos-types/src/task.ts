/**
 * @dos/types — task, action, and assignment types
 * Covers task management, assignments, SLAs, and approvals
 */

// ── Task Types ────────────────────────────────────────────────────────────

export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'review' | 'completed' | 'cancelled' | 'overdue';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskType =
  | 'remediation'
  | 'audit'
  | 'review'
  | 'evidence_collection'
  | 'assessment'
  | 'approval'
  | 'training'
  | 'policy_review'
  | 'risk_treatment'
  | 'compliance_check'
  | 'custom';

export interface Task {
  taskId: string;
  tenantId: string;
  workspaceId?: string;
  title: string;
  titleAr?: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  moduleCode: string;
  entityType?: string;
  entityId?: string;
  assignedTo?: string;
  assignedTeam?: string;
  createdBy: string;
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  checklist?: TaskChecklist[];
  parentTaskId?: string;
  subtaskIds?: string[];
  slaHours?: number;
  slaBreached?: boolean;
  slaBreachedAt?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskChecklist {
  itemId: string;
  label: string;
  labelAr?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  order: number;
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  type?: TaskType[];
  assignedTo?: string[];
  moduleCode?: string[];
  entityType?: string;
  entityId?: string;
  dueAfter?: string;
  dueBefore?: string;
  slaBreached?: boolean;
  workspaceId?: string;
}

// ── Assignment Types ──────────────────────────────────────────────────────

export type AssignmentStatus = 'pending' | 'accepted' | 'declined' | 'reassigned' | 'completed';

export interface Assignment {
  assignmentId: string;
  tenantId: string;
  taskId: string;
  assignedTo: string;
  assignedBy: string;
  status: AssignmentStatus;
  role?: string;
  note?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  reassignedTo?: string;
  reassignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkAssignmentRequest {
  taskIds: string[];
  assignedTo: string;
  role?: string;
  note?: string;
  sendNotification?: boolean;
}

export interface AssignmentStats {
  userId: string;
  tenantId: string;
  totalAssigned: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  avgCompletionDays?: number;
  utilizationPercent?: number;
}

// ── SLA Types ─────────────────────────────────────────────────────────────

export type SLAStatus = 'tracking' | 'at_risk' | 'breached' | 'completed' | 'suspended';

export interface SLAPolicy {
  policyId: string;
  tenantId: string;
  name: string;
  entityType: string;
  priority?: TaskPriority;
  responseHours: number;
  resolutionHours: number;
  warningPercent: number;
  businessHoursOnly: boolean;
  escalationRules: SLAEscalationRule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SLAEscalationRule {
  ruleId: string;
  triggerPercent: number;
  escalateTo: string[];
  notifyVia: string[];
  message?: string;
}

export interface SLATracking {
  trackingId: string;
  entityId: string;
  entityType: string;
  tenantId: string;
  policyId?: string;
  status: SLAStatus;
  responseDeadline?: string;
  resolutionDeadline?: string;
  respondedAt?: string;
  resolvedAt?: string;
  breachedAt?: string;
  percentElapsed?: number;
  timeRemainingMs?: number;
  isEscalated?: boolean;
  escalatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SLAPerformanceReport {
  tenantId: string;
  period: string;
  totalItems: number;
  metSLA: number;
  breachedSLA: number;
  complianceRate: number;
  averageResolutionHours: number;
  byPriority: Record<TaskPriority, { total: number; met: number; rate: number }>;
  byEntityType: Record<string, { total: number; met: number; rate: number }>;
}

// ── Approval Types ────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'delegated' | 'expired' | 'recalled';
export type ApprovalDecision = 'approve' | 'reject' | 'delegate' | 'request_info';

export interface ApprovalWorkflow {
  workflowId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  stages: ApprovalStage[];
  currentStage: number;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  dueDate?: string;
  priority?: TaskPriority;
  notes?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalStage {
  stageId: string;
  stageNumber: number;
  name: string;
  approverType: 'user' | 'role' | 'team' | 'any';
  approvers: string[];
  requireAll: boolean;
  status: ApprovalStatus;
  decision?: ApprovalDecision;
  decidedBy?: string;
  decidedAt?: string;
  comment?: string;
  delegatedTo?: string;
  deadline?: string;
}

export interface ApprovalRequest {
  requestId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  requestedBy: string;
  approvers: string[];
  priority?: TaskPriority;
  dueDate?: string;
  subject: string;
  subjectAr?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// ── Next Actions Types ────────────────────────────────────────────────────

export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'deferred' | 'skipped';
export type ActionItemSource = 'ai_recommendation' | 'compliance_gap' | 'risk_finding' | 'audit_finding' | 'manual';

export interface NextAction {
  actionId: string;
  tenantId: string;
  userId?: string;
  source: ActionItemSource;
  title: string;
  titleAr?: string;
  description?: string;
  priority: TaskPriority;
  status: ActionItemStatus;
  dueDate?: string;
  entityType?: string;
  entityId?: string;
  moduleCode?: string;
  estimatedMinutes?: number;
  tags?: string[];
  relatedActions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionQueue {
  userId: string;
  tenantId: string;
  total: number;
  critical: number;
  high: number;
  overdue: number;
  items: NextAction[];
  lastRefreshedAt: string;
}
