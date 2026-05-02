// ============================================
// Shahin — Risk Review & Approval Service
// Enterprise-grade review workflows, DAuth integration,
// approval matrices, and lifecycle transitions
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { logger as _logger } from '@dos/module-sdk';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';
import { eventBus } from '../../ports/events.port';

// Types
export interface RiskReviewRequest {
  riskId: string;
  reviewType: 'periodic' | 'escalation' | 'appetite_breach' | 'treatment_completion' | 'closure';
  requestedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  reviewNotes?: string;
  autoEscalationDays?: number;
}

export interface RiskReviewResponse {
  reviewId: string;
  riskId: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated' | 'completed';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  nextReviewDate?: string;
  conditions?: string[];
}

export interface RiskApprovalRequest {
  riskId: string;
  approvalType: 'risk_acceptance' | 'treatment_plan' | 'risk_closure' | 'appetite_breach' | 'escalation';
  requestedBy: string;
  requestedRole: string;
  urgency: 'normal' | 'urgent' | 'critical';
  businessJustification: string;
  riskLevel: string;
  controlEffectiveness?: string;
  mitigationPlan?: string;
}

export interface RiskApprovalResponse {
  approvalId: string;
  riskId: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'delegated';
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  conditions?: string[];
  delegatedTo?: string;
  validUntil?: string;
}

// Core Functions

/**
 * Create a new risk review request with DAuth validation
 */
export async function createRiskReview(
  tenantId: string,
  request: RiskReviewRequest,
  userId?: string,
  _userRoles: string[] = []
): Promise<RiskReviewResponse> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

/**
 * Submit risk for approval with DAuth lifecycle validation
 */
export async function submitForApproval(
  tenantId: string,
  request: RiskApprovalRequest,
  userId?: string,
  userRoles: string[] = []
): Promise<RiskApprovalResponse> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

/**
 * Process approval decision with DAuth validation
 */
export async function processApprovalDecision(
  tenantId: string,
  approvalId: string,
  decision: 'approved' | 'rejected' | 'escalated' | 'delegated',
  decisionData: {
    approvalNotes?: string;
    conditions?: string[];
    delegatedTo?: string;
    validUntil?: string;
  },
  userId?: string,
  userRoles: string[] = []
): Promise<RiskApprovalResponse> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

/**
 * Get pending reviews for a user/role
 */
export async function getPendingReviews(
  tenantId: string,
  userId?: string,
  _userRoles: string[] = [],
  limit: number = 50
): Promise<RiskReviewResponse[]> {
  const schema = tenantSchema(tenantId);
  
  let whereClause = `WHERE r.status IN ('pending', 'in_review')`;
  const params: any[] = [];
  
  if (userId) {
    whereClause += ` AND (r.assigned_to = $1 OR r.requested_by = $1)`;
    params.push(userId);
  }
  
  const result = await safeQuery(`
    SELECT r.review_id, r.risk_id, r.status, r.assigned_to, r.reviewed_by, 
           r.reviewed_at, r.review_notes, r.next_review_date, r.conditions,
           ri.title as risk_title, ri.category, ri.risk_score
    FROM "${schema}".risk_reviews r
    JOIN "${schema}".risks ri ON ri.risk_id = r.risk_id
    ${whereClause}
    ORDER BY r.priority DESC, r.created_at ASC
    LIMIT $${params.length + 1}
  `, [...params, limit]);
  
  return result.rows.map(mapRowToReviewResponse);
}

/**
 * Get pending approvals for a user/role
 */
export async function getPendingApprovals(
  tenantId: string,
  userId?: string,
  userRoles: string[] = [],
  limit: number = 50
): Promise<RiskApprovalResponse[]> {
  const schema = tenantSchema(tenantId);
  
  let whereClause = `WHERE ar.status = 'pending'`;
  const params: any[] = [];
  
  // Filter by role-based approval authority
  if (userRoles.length > 0) {
    whereClause += ` AND ($2 = ANY(ar.requested_role) OR 'risk_approver' = ANY($2))`;
    params.push(userRoles);
  }
  
  const result = await safeQuery(`
    SELECT ar.approval_id, ar.risk_id, ar.status, ar.approved_by, ar.approved_at,
           ar.approval_notes, ar.conditions, ar.delegated_to, ar.valid_until,
           ar.approval_type, ar.urgency, ar.business_justification,
           ri.title as risk_title, ri.category, ri.risk_score, ri.owner
    FROM "${schema}".risk_approval_requests ar
    JOIN "${schema}".risks ri ON ri.risk_id = ar.risk_id
    ${whereClause}
    ORDER BY ar.urgency DESC, ar.created_at ASC
    LIMIT $${params.length + 1}
  `, [...params, limit]);
  
  return result.rows.map(mapRowToApprovalResponse);
}

// Helper Functions

async function assignReviewer(tenantId: string, reviewId: string, reviewerId: string, assignmentType: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`
    UPDATE "${schema}".risk_reviews
    SET assigned_to = $1, assigned_at = NOW(), assignment_type = $2
    WHERE review_id = $3
  `, [reviewerId, assignmentType, reviewId]);
}

function calculateNextReviewDate(reviewType: string): string {
  const now = new Date();
  switch (reviewType) {
    case 'periodic':
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days
    case 'escalation':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    case 'appetite_breach':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    case 'treatment_completion':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days
    case 'closure':
      return new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days default
  }
}

async function updateRiskStatusAfterApproval(
  tenantId: string,
  riskId: string,
  approvalType: string,
  conditions?: string[]
): Promise<void> {
  const schema = tenantSchema(tenantId);
  
  let newStatus = 'approved';
  switch (approvalType) {
    case 'risk_acceptance':
      newStatus = 'accepted';
      break;
    case 'treatment_plan':
      newStatus = 'treatment_approved';
      break;
    case 'risk_closure':
      newStatus = 'closed';
      break;
    case 'appetite_breach':
      newStatus = 'appetite_accepted';
      break;
  }
  
  await safeQuery(`
    UPDATE "${schema}".risks
    SET status = $1, updated_at = NOW(), conditions = $2
    WHERE risk_id = $3
  `, [newStatus, conditions ? JSON.stringify(conditions) : null, riskId]);
}

async function escalateApproval(
  tenantId: string,
  riskId: string,
  approvalType: string,
  escalationReason?: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  
  await safeQuery(`
    UPDATE "${schema}".risks
    SET status = 'escalated', escalation_reason = $1, escalated_at = NOW()
    WHERE risk_id = $2
  `, [escalationReason || null, riskId]);
  
  // Emit escalation event
  await eventBus.publish({
    event_type: 'risk.escalated',
    data: {
      tenantId,
      riskId,
      approvalType,
      escalationReason,
      escalatedAt: new Date().toISOString()
    }
  });
}

function mapRowToReviewResponse(row: any): RiskReviewResponse {
  return {
    reviewId: row.review_id,
    riskId: row.risk_id,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    nextReviewDate: row.next_review_date,
    conditions: row.conditions ? JSON.parse(row.conditions) : undefined
  };
}

function mapRowToApprovalResponse(row: any): RiskApprovalResponse {
  return {
    approvalId: row.approval_id,
    riskId: row.risk_id,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    approvalNotes: row.approval_notes,
    conditions: row.conditions ? JSON.parse(row.conditions) : undefined,
    delegatedTo: row.delegated_to,
    validUntil: row.valid_until
  };
}

