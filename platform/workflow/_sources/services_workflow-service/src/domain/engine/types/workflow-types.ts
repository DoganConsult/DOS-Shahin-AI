// ============================================
// Shahin-Ai — Workflow Types
// Shared interfaces for workflow engine
// ============================================

/**
 * Workflow trigger configuration.
 */
export interface WorkflowTrigger {
  type: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WorkflowDefinition {
  nodes: import("@shahin/shared-workflow-types").WorkflowNode[];
  edges: import("@shahin/shared-workflow-types").WorkflowEdge[];
  swimlanes: string[];
  triggers: WorkflowTrigger[];
}

/**
 * Workflow row as returned from database.
 */
export interface WorkflowRow {
  workflow_id: string;
  name: string;
  definition: WorkflowDefinition;
  version?: number;
  created_by: string;
  department_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Workflow execution step log entry.
 */
export interface WorkflowStep {
  nodeId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  result?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
}

/**
 * Workflow execution instance.
 */
export interface WorkflowExecution {
  instance_id: string;
  workflow_id: string;
  workflow_name?: string;
  trigger_type: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  step_log: WorkflowStep[];
  is_simulation?: boolean;
}

/** Execution context for department-scoped workflow guard: user's department and whether they have tenant-wide execution role */
export type WorkflowExecutionContext = {
  userId?: string;
  departmentId?: string | null;
  isTenantWideRole?: boolean;
};

/**
 * Approval record as stored in the approvals table.
 */
export interface ApprovalRecord {
  approval_id: string;
  instance_id: string;
  step_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  sla_deadline: string | null;
  escalation_chain: string[];
  decision_comment: string | null;
  decided_at: string | null;
  created_at: string;
}
