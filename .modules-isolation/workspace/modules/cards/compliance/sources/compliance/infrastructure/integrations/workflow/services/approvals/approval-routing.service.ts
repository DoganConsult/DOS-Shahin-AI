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

import { withTenantClient } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { createNotification } from '../../../notification/services/notification.service';
import type { PoolClient } from 'pg';
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
  const { approval, resolvedChain, firstApproverId } = await withTenantClient(tenantId, async (client) => {
    const configResult = await client.query<{ config_value: any }>(
      `SELECT config_value FROM tenant_config
        WHERE config_key = 'approvalRouting' LIMIT 1`,
    );

    const routingConfig = configResult.rows[0]?.config_value || {};
    const routeDefinition = routingConfig[input.routeId] || routingConfig['default'] || { steps: [] };
    const resolvedChain = await resolveApproverChain(client, routeDefinition.steps || []);

    const firstApproverId = resolvedChain.length > 0
      ? (resolvedChain[0].resolvedUserId || resolvedChain[0].userId || null)
      : null;

    const result = await client.query(
      `INSERT INTO approval_requests
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
    return { approval: mapApprovalRow(result.rows[0]), resolvedChain, firstApproverId };
  });

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
      approval.approvalId,
      input.entityType,
      input.entityId,
      (input as any).context?.priority ?? 'medium',
      firstApproverId,
    );
    if (autoApproved) {
      // Re-fetch to get updated status
      const updated = await getApprovalDetail(tenantId, approval.approvalId);
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

  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT * FROM approval_requests ${where}
        ORDER BY created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );
    return result.rows.map(mapApprovalRow);
  });
}

/**
 * Get pending approvals for a specific user.
 * Requirements: 17.5
 */
export async function getPendingApprovals(
  tenantId: string,
  userId: string,
): Promise<ApprovalRequest[]> {
  const rows = await withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT * FROM approval_requests
        WHERE status = 'pending'
          AND (current_approver_id = $1
               OR (current_approver_id IS NULL AND approver_chain IS NOT NULL))
        ORDER BY created_at DESC
        LIMIT 200`,
      [userId],
    );
    return result.rows;
  });

  const pending = rows.filter((row: GenericRow) => {
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
  const row = await withTenantClient(tenantId, async (client) => {
    const r = await client.query(
      `SELECT * FROM approval_requests WHERE approval_id = $1 LIMIT 1`,
      [approvalId],
    );
    return r.rows[0] ?? null;
  });
  if (!row) throw new Error(`approval ${approvalId} not found in tenant ${tenantId}`);
  return mapApprovalRow(row);
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
  const { previousStatus, nextApproverId, requestedBy, entityType, entityId } =
    await withTenantClient(tenantId, async (client) => {
      const cur = await client.query(
        `SELECT * FROM approval_requests WHERE approval_id = $1 FOR UPDATE`,
        [approvalId],
      );
      const row = cur.rows[0];
      if (!row) throw new Error(`approval ${approvalId} not found in tenant ${tenantId}`);
      if (row.status !== 'pending') {
        throw new Error(`approval ${approvalId} is not pending (status=${row.status})`);
      }

      // SoD: prevent self-approval — requester cannot also approve.
      const sod = await preventSelfApproval(tenantId, row.requested_by, decision.approverId);
      if (!sod.allowed) throw new Error(sod.reason || 'self-approval blocked');

      // Verify the decider is the current approver (or is delegating).
      if (row.current_approver_id && row.current_approver_id !== decision.approverId
          && decision.decision !== 'delegated') {
        throw new Error(`only the current approver may decide on this request`);
      }

      const chain = typeof row.approver_chain === 'string'
        ? JSON.parse(row.approver_chain)
        : (row.approver_chain || []);
      const currentStep = row.current_step || 0;

      const decisionEntry = {
        approverId: decision.approverId,
        decision: decision.decision,
        reason: decision.reason ?? null,
        delegateTo: decision.delegateTo ?? null,
        decidedAt: new Date().toISOString(),
        step: currentStep,
      };

      let nextStatus = row.status;
      let nextStep = currentStep;
      let nextApproverId: string | null = row.current_approver_id;

      if (decision.decision === 'rejected') {
        nextStatus = 'rejected';
        nextApproverId = null;
      } else if (decision.decision === 'delegated') {
        if (!decision.delegateTo) throw new Error('delegateTo is required for delegated decision');
        nextApproverId = decision.delegateTo;
        chain[currentStep] = { ...(chain[currentStep] || {}), resolvedUserId: decision.delegateTo, delegated: true };
      } else {
        // approved — advance to next step or complete.
        nextStep = currentStep + 1;
        if (nextStep >= chain.length) {
          nextStatus = 'approved';
          nextApproverId = null;
        } else {
          const nextEntry = chain[nextStep];
          nextApproverId = nextEntry?.resolvedUserId || nextEntry?.userId || null;
        }
      }

      await client.query(
        `UPDATE approval_requests
            SET status = $1,
                current_step = $2,
                current_approver_id = $3,
                approver_chain = $4,
                approval_decisions = COALESCE(approval_decisions, '[]'::jsonb) || $5::jsonb,
                updated_at = NOW()
          WHERE approval_id = $6`,
        [nextStatus, nextStep, nextApproverId, JSON.stringify(chain), JSON.stringify(decisionEntry), approvalId],
      );

      return {
        previousStatus: row.status,
        nextApproverId,
        requestedBy: row.requested_by as string,
        entityType: row.entity_type as string,
        entityId: row.entity_id as string,
      };
    });

  // Audit + downstream notifications (outside the transaction).
  await recordAudit({
    tenantId,
    userId: decision.approverId,
    module: 'approval-routing',
    action: decision.decision,
    entityType: 'approval_request',
    entityId: approvalId,
    beforeState: { status: previousStatus },
    afterState: { decision: decision.decision, reason: decision.reason ?? null },
  });

  if (nextApproverId) {
    try {
      await createNotification(tenantId, {
        userId: nextApproverId,
        type: 'approval_request',
        title: `Approval required (next step)`,
        body: `Your decision is required for ${entityType} ${entityId}`,
        link: `/approvals/${approvalId}`,
      });
    } catch { /* non-fatal */ }
  } else {
    try {
      await createNotification(tenantId, {
        userId: requestedBy,
        type: 'approval_decided',
        title: `Approval ${decision.decision}`,
        body: `Your request for ${entityType} ${entityId} was ${decision.decision}`,
        link: `/approvals/${approvalId}`,
      });
    } catch { /* non-fatal */ }
  }

  try {
    await eventBus.emit(`approval.${decision.decision}`, {
      tenantId,
      approvalId,
      decidedBy: decision.approverId,
    });
  } catch { /* best-effort */ }
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Resolve role-based approvers to actual user IDs.
 * For each step, if a role is specified instead of a userId,
 * query users with that role and select the first available.
 */
async function resolveApproverChain(
  client: PoolClient,
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
        const userResult = await client.query<{ user_id: string }>(
          `SELECT ura.user_id FROM enterprise_user_role_assignments ura
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
        const userResult = await client.query<{ user_id: string }>(
          `SELECT user_id FROM users WHERE role = $1 LIMIT 1`,
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
