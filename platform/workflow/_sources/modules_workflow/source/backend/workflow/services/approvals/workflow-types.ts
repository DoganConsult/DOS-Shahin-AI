import { safeQuery } from "@dos/db";

/**
 * Workflow Approval Types — MP-02 §6 (Contracts)
 *
 * Canonical type definitions for the approval subsystem.
 * Re-exports ApprovalRecord from the canonical DOS workflow types
 * and defines approval-specific subtypes used by the approval engine,
 * routing, mandatory review, and prescreen services.
 *
 * Law 2: Single canonical owner per concern — DAuth owns authority decisions,
 * this module owns the approval record contract.
 */

export { type ApprovalRecord } from '../../ports/lifecycle.port';

/** Decision a resolver can submit for an approval step. */
export type ApprovalDecision = 'approved' | 'rejected';

/** Escalation status for tracking SLA-driven escalation progression. */
export type EscalationStatus = 'none' | 'warning' | 'breached' | 'escalated';

/** Approval routing strategy determines how approvers are selected. */
export type ApprovalRoutingStrategy = 'role_based' | 'hierarchical' | 'custom' | 'pool';

/** Approval logic for parallel/quorum scenarios. */
export type ApprovalLogic = 'AND' | 'OR' | 'QUORUM';

/** Compact approval queue entry for UI rendering. */
export interface ApprovalQueueEntry {
  approval_id: string;
  execution_id: string;
  step_id: string;
  approver_id: string;
  status: string;
  sla_deadline: string | null;
  created_at: string;
  workflow_name?: string;
  entity_type?: string;
  entity_id?: string;
  priority?: string;
}

/** Approval history entry with resolver metadata. */
export interface ApprovalHistoryEntry {
  approval_id: string;
  execution_id: string;
  step_id: string;
  approver_id: string;
  status: string;
  decision_comment: string | null;
  decided_at: string | null;
  escalated_to: string | null;
  escalation_level: number;
  created_at: string;
  resolved_via?: 'direct' | 'delegation' | 'escalation' | 'auto';
}

/** Input contract for creating an approval step. */
export interface CreateApprovalInput {
  executionId: string;
  stepId: string;
  approverId: string;
  slaHours?: number;
  escalationChain?: string[];
  routingStrategy?: ApprovalRoutingStrategy;
  metadata?: Record<string, unknown>;
}

/** Input contract for resolving an approval decision. */
export interface ResolveApprovalInput {
  approvalId: string;
  decision: ApprovalDecision;
  comment?: string;
  resolvedBy: string;
  delegatedFrom?: string;
}

/** Result of an approval precondition check. */
export interface PreconditionResult {
  valid: boolean;
  missing: string[];
  warnings?: string[];
}

/** Parallel approval configuration. */
export interface ParallelApprovalConfig {
  approvers: Array<{ userId: string; role: string }>;
  logic: ApprovalLogic;
  quorumCount?: number;
  slaHours?: number;
}

/** SLA breach information for an approval. */
export interface ApprovalSLAInfo {
  approvalId: string;
  slaDeadline: string | null;
  hoursRemaining: number | null;
  percentElapsed: number;
  status: EscalationStatus;
}
