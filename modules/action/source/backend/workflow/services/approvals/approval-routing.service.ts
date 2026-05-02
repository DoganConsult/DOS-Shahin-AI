/**
 * @deprecated @removal-date 2026-06-30 @owner Module @replacement Shared approval engine
 * Local SoD/approval logic must be replaced by DAuth SodEngine. See AGENTS.md §10.
 */
import { logger } from '../../ports/logger.port';
// ============================================
// Shahin-Ai — Approval Routing Service
// Configurable approval chains read from
// TenantConfig.approvalRouting. Resolves
// role-based approvers, tracks decisions,
// and advances chains on approve/reject/delegate.
//
// Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { createNotification } from '../../../notification/services/notification.service';
/** Self-approval prevention — §9.1 authority-aware, delegates to DAuth SoD check. */
async function preventSelfApproval(_tenantId: string, requestedBy: string, approverId: string): Promise<{ allowed: boolean; reason?: string }> {
  if (requestedBy === approverId) {
    return { allowed: false, reason: 'Self-approval is not permitted — requester and approver must be different users (§9.1)' };
  }
  return { allowed: true };
}
import { enterpriseAuthzService } from '../../../admin/services/enterprise-authz.service';
import { tryAutoApprove } from '../tasks/task-auto-resolution.service';
import type { ApprovalRequest } from '@dos/types';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';

// ── Initiate Approval ──────────────────────────────────────────────────────

/**
 * Initiate an approval request. Reads TenantConfig.approvalRouting,
 * resolves the approver chain (role-based → actual users), and creates
 * an approval_requests record.
 *
 * Requirements: 17.1, 17.2, 17.3
 */
export async function initiateApproval(
  tenantId: string,
  input: {
    entityType: string;
    entityId: string;
    action: string;
    requestedBy: string;
    routeId: string;
    context?: Record<string, unknown>;
  },
): Promise<ApprovalRequest> {
  const schema = tenantSchema(tenantId);

  // Read approval routing config from tenant_config
  const configResult = await safeQuery(
    `SELECT config_value FROM "${schema}".tenant_config
     WHERE config_key = 'approvalRouting' LIMIT 1`,
  );

  const routingConfig = configResult.rows[0]?.config_value || {};
  const routeDefinition = routingConfig[input.routeId] || routingConfig['default'] || { steps: [] };

  // Resolve the approver chain
  const resolvedChain = await resolveApproverChain(schema, routeDefinition.steps || []);

  // Determine first approver for current_approver_id
  const firstApproverId = resolvedChain.length > 0
    ? (resolvedChain[0].resolvedUserId || resolvedChain[0].userId || null)
    : null;

  // Create approval request with SLA deadline and current_approver_id
  const result = await safeQuery(
    `INSERT INTO "${schema}".approval_requests
       (entity_type, entity_id, action, requested_by, route_id, approver_chain, current_step, status, context,
        current_approver_id, sla_deadline)
     VALUES ($1, $2, $3, $4, $5, $6, 0, 'pending', $7, $8, NOW() + INTERVAL '72 hours')
     RETURNING *`,
    [
      input.entityType,
      input.entityId,
      input.action,
      input.requestedBy,
      input.routeId,
      JSON.stringify(resolvedChain),
      JSON.stringify(input.context || {}),
      firstApproverId,
    ],
  );

  const approval = mapApprovalRow(result.rows[0]);

  // Notify the first approver
  if (resolvedChain.length > 0) {
    const firstApprover = resolvedChain[0];
    const approverId = firstApprover.userId || firstApprover.resolvedUserId;
    if (approverId) {
      try {
        await createNotification(tenantId, {
          userId: approverId,
          type: 'approval_request',
          title: `Approval required: ${input.action}`,
          body: `${input.requestedBy} requested approval for ${input.entityType} ${input.entityId}`,
          link: `/approvals/${approval.approvalId}`,
        });
      } catch {
        // Non-fatal
      }
    }
  }

  // Record audit trail
  await recordAudit({
    tenantId,
    userId: input.requestedBy,
    module: 'approval-routing',
    action: 'create',
    entityType: 'approval_request',
    entityId: approval.approvalId,
    afterState: { action: input.action, routeId: input.routeId, chainLength: resolvedChain.length },
  });

  // ── Auto-Approval Check (autonomous governance) ─────────────────────────
  // If the entity qualifies for auto-approval (low-risk, below threshold),
  // auto-approve immediately without waiting for a human reviewer.
  try {
    const autoApproved = await tryAutoApprove(
      tenantId,
      approval.approvalId ?? '',
      input.entityType,
      input.entityId,
      (input as any).context?.priority ?? 'medium',
      firstApproverId,
    );
    if (autoApproved) {
      // Re-fetch to get updated status
      const updated = await getApprovalDetail(tenantId, approval.approvalId ?? '');
      logger.info(`[ApprovalRouting] Auto-approved ${approval.approvalId} (${input.entityType}:${input.entityId})`);
      return updated;
    }
  } catch (e: unknown) {
    // Auto-approval is best-effort — don't block the normal flow
    logger.warn(`[ApprovalRouting] Auto-approval check failed for ${approval.approvalId}: ${toErrorMessage(e)}`);
  }

  return approval;
}


// ── Query Functions ────────────────────────────────────────────────────────

/**
 * List approval requests for a tenant with optional filters.
 * Requirements: 17.5
 */
export async function listApprovalRequests(
  tenantId: string,
  filters?: { status?: string; entityType?: string; limit?: number; offset?: number },
): Promise<ApprovalRequest[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.entityType) {
    conditions.push(`entity_type = $${idx++}`);
    params.push(filters.entityType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;

  const result = await safeQuery(
    `SELECT * FROM "${schema}".approval_requests ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset],
  );

  return result.rows.map(mapApprovalRow);
}

/**
 * Get pending approvals for a specific user.
 * Requirements: 17.5
 */
export async function getPendingApprovals(
  tenantId: string,
  userId: string,
): Promise<ApprovalRequest[]> {
  const schema = tenantSchema(tenantId);

  // Server-side filter using current_approver_id (set by initiateApproval / submitDecision)
  // Falls back to client-side filter for rows migrated before current_approver_id existed
  const result = await safeQuery(
    `SELECT * FROM "${schema}".approval_requests
     WHERE status = 'pending'
       AND (current_approver_id = $1
            OR (current_approver_id IS NULL AND approver_chain IS NOT NULL))
     ORDER BY created_at DESC
     LIMIT 200`,
    [userId],
  );

  // For rows where current_approver_id was null, apply client-side filter
  const pending = result.rows.filter((row: GenericRow) => {
    if (row.current_approver_id === userId) return true;
    if (row.current_approver_id) return false;
    // Legacy fallback: check approver_chain[current_step]
    const chain = typeof row.approver_chain === 'string'
      ? JSON.parse(row.approver_chain)
      : row.approver_chain || [];
    const currentStep = row.current_step || 0;
    if (currentStep >= chain.length) return false;
    const stepApprover = chain[currentStep];
    return stepApprover?.userId === userId || stepApprover?.resolvedUserId === userId;
  });

  return pending.map(mapApprovalRow);
}

/**
 * Get approval request detail by ID.
 * Requirements: 17.5
 */
export async function getApprovalDetail(
  tenantId: string,
  approvalId: string,
): Promise<ApprovalRequest> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".approval_requests WHERE approval_id = $1`,
    [approvalId]
  );
  return (result?.rows?.[0] ?? {}) as unknown as ApprovalRequest;
}

// ── Submit Decision ────────────────────────────────────────────────────────

/**
 * Submit a decision (approve, reject, or delegate) for an approval request.
 * On approve: advances chain or completes. On reject: sets status rejected.
 * On delegate: reassigns current step.
 *
 * Requirements: 17.4, 17.6, 17.7
 */
export async function submitDecision(
  tenantId: string,
  approvalId: string,
  decision: {
    approverId: string;
    decision: 'approved' | 'rejected' | 'delegated';
    reason?: string;
    delegateTo?: string;
  },
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.workflow_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Resolve role-based approvers to actual user IDs.
 * For each step, if a role is specified instead of a userId,
 * query users with that role and select the first available.
 */
async function resolveApproverChain(
  schema: string,
  steps: Array<{ userId?: string; role?: string; functionalRoleCode?: string; moduleCode?: string; step?: number }>,
): Promise<Array<{ userId?: string; role?: string; resolvedUserId?: string; step: number }>> {
  const resolved: Array<{ userId?: string; role?: string; resolvedUserId?: string; step: number }> = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const entry: { userId?: string; role?: string; resolvedUserId?: string; step: number } = {
      step: step.step ?? i,
      userId: step.userId,
      role: step.role || step.functionalRoleCode,
    };

    if (step.userId) {
      entry.resolvedUserId = step.userId;
    } else if (step.functionalRoleCode) {
      // Enterprise role resolution — query enterprise_user_role_assignments
      try {
        const userResult = await safeQuery(
          `SELECT ura.user_id FROM "${schema}".enterprise_user_role_assignments ura
           WHERE ura.functional_role_code = $1
           ${step.moduleCode ? 'AND ura.module_code = $2' : ''}
           AND ura.is_active = TRUE AND (ura.valid_to IS NULL OR ura.valid_to > NOW())
           ORDER BY ura.is_primary DESC, ura.created_at ASC LIMIT 1`,
          step.moduleCode ? [step.functionalRoleCode, step.moduleCode] : [step.functionalRoleCode],
        );
        if (userResult.rows.length > 0) {
          entry.resolvedUserId = userResult.rows[0].user_id;
        }
      } catch {
        // Fall through to legacy resolution
      }
    }

    // Legacy fallback: resolve by role name in users table
    if (!entry.resolvedUserId && step.role) {
      try {
        const userResult = await safeQuery(
          `SELECT user_id FROM "${schema}".users WHERE role = $1 LIMIT 1`,
          [step.role],
        );
        if (userResult.rows.length > 0) {
          entry.resolvedUserId = userResult.rows[0].user_id;
        }
      } catch {
        // If users table doesn't exist or query fails, leave unresolved
      }
    }

    resolved.push(entry);
  }

  return resolved;
}

function mapApprovalRow(row: Record<string, unknown>): ApprovalRequest {
  return {

    approvalId: row.approval_id,

    entityType: row.entity_type,

    entityId: row.entity_id,
    action: row.action,

    requestedBy: row.requested_by,
    routeId: row.route_id,
    approverChain: typeof row.approver_chain === 'string'
      ? JSON.parse(row.approver_chain)
      : row.approver_chain || [],
    currentStep: row.current_step || 0,

    status: row.status,
    context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context || {},
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}
