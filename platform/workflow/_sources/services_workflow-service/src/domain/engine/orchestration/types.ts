// ============================================
// Process Orchestration — Shared Types & Constants
// ============================================

export type ScopeType = 'tenant' | 'organization' | 'department' | 'team' | 'position' | 'process' | 'policy' | 'workflow';

// ── Public Types ────────────────────────────────────────────────────────────

export type ProcessTaskType =
  | 'evidence_request'
  | 'control_review'
  | 'risk_assessment'
  | 'policy_creation'
  | 'audit_response'
  | 'incident_response'
  | 'remediation'
  | 'approval'
  | 'verification'
  // ── Vendor Cross-Agent Task Types ──
  | 'vendor_risk_propagation'      // A09→A07: vendor risk → enterprise risk register
  | 'vendor_gap_remediation'       // A09→A06: vendor compliance gap → remediation
  | 'vendor_evidence_review'       // A09→A05: vendor cert/attestation → evidence validation
  | 'vendor_audit_finding'         // A09→A10: vendor finding → audit universe
  | 'vendor_framework_sync'        // A09→A03: shared-responsibility → framework mapping
  | 'training_assignment'           // Cross-module: auto-assigned training from compliance/risk/audit hooks
  // ── Workflow-Generated Task Types ──
  | 'workflow_task'                 // Generic actionable step from workflow execution
  | 'workflow_approval'            // Approval gate from workflow execution
  // ── Module Subscriber Task Types ──
  | 'asset_review'
  | 'exception_review'
  | 'training_review'
  | 'training_content_review'
  | 'training_content_creation'
  | 'issue_triage'
  | 'qiyas_reassessment'
  | 'qiyas_score_review'
  | 'ai_governance_review'
  | 'foundation_review'
  | 'report_regeneration'
  | 'report_generation'
  | 'ai_analysis'
  | 'ai_classification'
  | 'ai_execution'
  | 'integration_health_check'
  | 'admin_review'
  | 'workflow_trigger'
  | 'portal_review'
  | 'records_review'
  | 'records_retention_review'
  | 'records_archival'
  | 'privacy_breach_response'
  | 'privacy_review'
  | 'privacy_impact_assessment'
  | 'privacy_notice_review'
  | 'team_review'
  | 'team_reassignment'
  | 'action_tracking'
  | 'bcp_review'
  | 'dora_obligation_review';

export interface ProcessTaskInput {
  title: string;
  description?: string;
  taskType: ProcessTaskType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  entityType?: string;
  entityId?: string;
  controlId?: string;
  dueInHours?: number;
  triggerSource?: string;
  triggerData?: Record<string, unknown>;
  parentTaskId?: string;
  blockingTaskIds?: string[];
  createdBy?: string;
  /** Optional role hint — if set, task routes to a user with this role before RACI fallback */
  assigneeRole?: string;
  /** Workflow linkage — set when task is created from a workflow execution step */
  workflowExecutionId?: string;
  workflowStepId?: string;
  sourceModule?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  assignedTo?: string;
}

export interface ProcessTask {
  taskId: string;
  teamId: string | null;
  assignedUserId: string | null;
  title: string;
  taskType: ProcessTaskType;
  priority: string;
  status: string;
  slaHours: number;
  dueDate: string;
  routingTier?: string;
}

// ── Internal Types ──────────────────────────────────────────────────────────

export interface RoutingResolution {
  teamId: string | null;
  assignedUserId: string | null;
  scopeType: ScopeType | null;
  scopeId: string | null;
  orgUnitId?: string | null;
  tier: string;
  metadata: Record<string, unknown>;
}

export const EMPTY_RESOLUTION: RoutingResolution = {
  teamId: null, assignedUserId: null, scopeType: null, scopeId: null, tier: 'none', metadata: {},
};

// ── Constants ───────────────────────────────────────────────────────────────

export const SLA_DEFAULTS: Record<string, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
};

// Hardcoded fallback — overridden by task_type_config DB table (migration 357)
export const TASK_TYPE_TO_PERMISSION_ACTION: Record<string, string> = {
  evidence_request: 'record.create',
  control_review: 'record.review',
  risk_assessment: 'record.review',
  policy_creation: 'record.create',
  audit_response: 'record.create',
  incident_response: 'record.create',
  remediation: 'record.update',
  approval: 'record.approve',
  verification: 'record.review',
  vendor_risk_propagation: 'record.create',
  vendor_gap_remediation: 'record.create',
  vendor_evidence_review: 'record.review',
  vendor_audit_finding: 'record.create',
  vendor_framework_sync: 'record.update',
  workflow_task: 'record.update',
  workflow_approval: 'record.approve',
};

// Priority → Minimum Authority Level (for approval/verification only)
export const TASK_PRIORITY_TO_MIN_AUTHORITY: Record<string, string> = {
  critical: 'approve_high',
  high: 'approve_medium',
  medium: 'approve_low',
  low: 'submit',
};
