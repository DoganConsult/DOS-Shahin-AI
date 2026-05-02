import { logger } from '@dos/platform-core/observability';
// ============================================
// Policy Activities
// Policy lifecycle and exception workflow activities.
// Called by policy-lifecycle.workflow.ts and
// policy-exception.workflow.ts.
// ============================================

import { query, safeQuery, tenantSchema, assertTenantId } from '@dos/db';
import { createNotification } from '../../../adapters/notification.adapter';
import { recordAudit } from '../../../adapters/audit.adapter';
import { emitEvent } from '@dos/platform-core/events';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { getFirstRow } from '../../utils/db-utils';
import { v4 as uuid } from 'uuid';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

// ── Activity Interface ──────────────────────────────────────────────────────────

export interface PolicyActivities {
  assignPolicyReviewers(tenantId: string, policyId: string): Promise<string[]>;
  sendPolicyReviewRequest(tenantId: string, policyId: string, reviewerIds: string[]): Promise<void>;
  checkReviewCompletion(tenantId: string, policyId: string): Promise<boolean>;
  routePolicyApproval(tenantId: string, policyId: string): Promise<string | null>;
  markPolicyPublished(tenantId: string, policyId: string): Promise<void>;
  createAutoAttestationCampaign(tenantId: string, policyId: string): Promise<string>;
  sendExceptionRenewalReminder(tenantId: string, exceptionId: string): Promise<void>;
  autoExpireException(tenantId: string, exceptionId: string): Promise<void>;
  escalatePolicyReview(tenantId: string, policyId: string, level: number): Promise<void>;
  notifyPolicyRejection(tenantId: string, policyId: string, reason: string): Promise<void>;
}

// ── Review Step Keys ────────────────────────────────────────────────────────────

/** The 13-step policy process template step keys used for review/approval tracking */
const REVIEW_STEP_KEYS = ['internal_review', 'legal_review', 'compliance_review'] as const;

const POLICY_PROCESS_TEMPLATE_STEPS = [
  'draft_creation', 'stakeholder_identification', 'internal_review',
  'legal_review', 'compliance_review', 'revision', 'management_approval',
  'board_approval', 'publication', 'communication', 'training',
  'attestation', 'periodic_review',
] as const;

// ── Activities ──────────────────────────────────────────────────────────────────

/**
 * Assign reviewers to a policy's review steps.
 * Creates the 13-step template if process actions do not yet exist,
 * then resolves RACI reviewers for the policy domain and assigns them.
 *
 * @returns Array of reviewer user IDs that were assigned.
 */
export async function assignPolicyReviewers(
  tenantId: string,
  policyId: string,
): Promise<string[]> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    // Check if process actions already exist for this policy
    const dbTimeout = createTypedTimeout('db', 'checkPolicyProcessActions');
    const existing = await dbTimeout(() => query(
      `SELECT COUNT(*)::int AS cnt
       FROM "${schema}".policy_process_actions
       WHERE policy_id = $1`,
      [policyId],
    ));
    const count = getFirstRow(existing)?.cnt ?? 0;

    // Create from 13-step template if none exist
    if (count === 0) {
      const insertTimeout = createTypedTimeout('db', 'seedPolicyProcessActions');
      for (let i = 0; i < POLICY_PROCESS_TEMPLATE_STEPS.length; i++) {
        await insertTimeout(() => query(
          `INSERT INTO "${schema}".policy_process_actions
             (action_id, policy_id, step_key, step_order, status, created_at)
           VALUES ($1, $2, $3, $4, 'pending', NOW())`,
          [uuid(), policyId, POLICY_PROCESS_TEMPLATE_STEPS[i], i + 1],
        ));
      }
    }

    // Resolve RACI reviewers for the policy domain
    const raciTimeout = createTypedTimeout('db', 'resolveRaciReviewers');
    const raciResult = await raciTimeout(() => query(
      `SELECT DISTINCT r.user_id
       FROM "${schema}".raci_assignments r
       WHERE r.scope_type = 'policy'
         AND r.role IN ('responsible', 'consulted')
         AND r.user_id IS NOT NULL`,
      [],
    ));

    const reviewerIds: string[] = raciResult.rows.map(( r: Record<string, unknown>) => r.user_id as string);

    // Assign reviewers to review steps
    if (reviewerIds.length > 0) {
      const assignTimeout = createTypedTimeout('db', 'assignPolicyReviewers');
      for (const stepKey of REVIEW_STEP_KEYS) {
        await assignTimeout(() => query(
          `UPDATE "${schema}".policy_process_actions
           SET assigned_to = $1, updated_at = NOW()
           WHERE policy_id = $2 AND step_key = $3`,
          [reviewerIds[0], policyId, stepKey],
        ));
      }
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      action: 'update',
      entityType: 'policy',
      entityId: policyId,
      afterState: { reviewerIds, stepsCreated: count === 0 },
    });

    return reviewerIds;
  } catch (err: unknown) {
    logger.error(`[Policy] assignPolicyReviewers failed: ${toErrorMessage(err)}`);
    throw err;
  }
}

/**
 * Send review request notifications to all assigned reviewers.
 * Inserts into the notification queue with action_required = true.
 */
export async function sendPolicyReviewRequest(
  tenantId: string,
  policyId: string,
  reviewerIds: string[],
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    // Fetch policy title for the notification subject
    const dbTimeout = createTypedTimeout('db', 'fetchPolicyTitle');
    const policyResult = await dbTimeout(() => query(
      `SELECT title FROM "${schema}".policies WHERE policy_id = $1`,
      [policyId],
    ));
    const policyTitle = getFirstRow(policyResult)?.title ?? 'Untitled Policy';

    const notifyTimeout = createTypedTimeout('api', 'sendReviewNotifications');
    for (const reviewerId of reviewerIds) {
      await notifyTimeout(() => createNotification(tenantId, {
        userId: reviewerId,
        type: 'policy_review_request',
        title: `Policy Review Required: ${policyTitle}`,
        body: `You have been assigned to review the policy "${policyTitle}". Please complete your review within the designated SLA window.`,
      }));
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      action: 'create',
      entityType: 'notification',
      entityId: policyId,
      afterState: { reviewerIds, type: 'review_request' },
    });
  } catch (err: unknown) {
    logger.warn(`[Policy] sendPolicyReviewRequest non-fatal: ${toErrorMessage(err)}`);
  }
}

/**
 * Check whether all review steps (internal, legal, compliance) are completed.
 *
 * @returns true if ALL review steps have status = 'completed'.
 */
export async function checkReviewCompletion(
  tenantId: string,
  policyId: string,
): Promise<boolean> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    const dbTimeout = createTypedTimeout('db', 'checkReviewCompletion');
    const result = await dbTimeout(() => query(
      `SELECT step_key, status
       FROM "${schema}".policy_process_actions
       WHERE policy_id = $1
         AND step_key IN ('internal_review', 'legal_review', 'compliance_review')`,
      [policyId],
    ));

    if (result.rows.length === 0) return false;

    // All review steps must be completed
    return result.rows.every((row: Record<string, unknown>) => row.status === 'completed');
  } catch (err: unknown) {
    logger.warn(`[Policy] checkReviewCompletion non-fatal: ${toErrorMessage(err)}`);
    return false;
  }
}

/**
 * Route a policy to its approval step by finding the RACI Accountable role
 * for the policy domain. Assigns the approver and sends a notification.
 *
 * @returns The approver user ID, or null if none found.
 */
export async function routePolicyApproval(
  tenantId: string,
  policyId: string,
): Promise<string | null> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    // Find RACI Accountable role for policy domain
    const raciTimeout = createTypedTimeout('db', 'resolveRaciApprover');
    const raciResult = await raciTimeout(() => query(
      `SELECT r.user_id
       FROM "${schema}".raci_assignments r
       WHERE r.scope_type = 'policy'
         AND r.role = 'accountable'
         AND r.user_id IS NOT NULL
       LIMIT 1`,
      [],
    ));

    const approverId = getFirstRow(raciResult)?.user_id ?? null;

    if (approverId) {
      // Assign approver to approval steps
      const assignTimeout = createTypedTimeout('db', 'assignPolicyApprover');
      await assignTimeout(() => query(
        `UPDATE "${schema}".policy_process_actions
         SET assigned_to = $1, status = 'in_progress', updated_at = NOW()
         WHERE policy_id = $2
           AND step_key IN ('management_approval', 'board_approval')
           AND status != 'completed'`,
        [approverId, policyId],
      ));

      // Fetch policy title for the notification
      const policyResult = await safeQuery(
        `SELECT title FROM "${schema}".policies WHERE policy_id = $1`,
        [policyId],
      );
      const policyTitle = getFirstRow(policyResult)?.title ?? 'Untitled Policy';

      await createNotification(tenantId, {
        userId: approverId,
        type: 'policy_approval_request',
        title: `Policy Approval Required: ${policyTitle}`,
        body: `The policy "${policyTitle}" has completed review and requires your approval.`,
      });
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      action: 'update',
      entityType: 'policy',
      entityId: policyId,
      afterState: { approverId, phase: 'approval' },
    });

    return approverId;
  } catch (err: unknown) {
    logger.error(`[Policy] routePolicyApproval failed: ${toErrorMessage(err)}`);
    throw err;
  }
}

/**
 * Mark a policy as published and complete the publication process step.
 * Emits a `policy.published` event for downstream consumers.
 */
export async function markPolicyPublished(
  tenantId: string,
  policyId: string,
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    const dbTimeout = createTypedTimeout('db', 'markPolicyPublished');

    // Update policy status
    await dbTimeout(() => query(
      `UPDATE "${schema}".policies
       SET status = 'published',
           publication_state = 'published',
           approval_status = 'approved',
           published_at = NOW(),
           updated_at = NOW()
       WHERE policy_id = $1`,
      [policyId],
    ));

    // Complete the publish process step
    await dbTimeout(() => query(
      `UPDATE "${schema}".policy_process_actions
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE policy_id = $1 AND step_key = 'publication'`,
      [policyId],
    ));

    // Emit event for downstream consumers
    await emitEvent({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      event: 'policy.published',
      entityType: 'policy',
      entityId: policyId,
      data: { status: 'published' },
    });

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      action: 'update',
      entityType: 'policy',
      entityId: policyId,
      afterState: { status: 'published', publication_state: 'published' },
    });
  } catch (err: unknown) {
    logger.error(`[Policy] markPolicyPublished failed: ${toErrorMessage(err)}`);
    throw err;
  }
}

/**
 * Create an automatic attestation campaign for a published policy.
 * Queries the policy's audience scope, creates the campaign with a 30-day
 * due date, and inserts attestation records for each user in the audience.
 *
 * @returns The newly created campaign ID.
 */
export async function createAutoAttestationCampaign(
  tenantId: string,
  policyId: string,
): Promise<string> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    // Fetch policy details and audience scope
    const dbTimeout = createTypedTimeout('db', 'fetchPolicyAudience');
    const policyResult = await dbTimeout(() => query(
      `SELECT title, audience_scope FROM "${schema}".policies WHERE policy_id = $1`,
      [policyId],
    ));
    const policy = getFirstRow(policyResult);
    const policyTitle = policy?.title ?? 'Untitled Policy';
    const audienceScope = policy?.audience_scope ?? 'all';

    // Create the attestation campaign
    const campaignId = uuid();
    const dueDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const campaignTimeout = createTypedTimeout('db', 'createAttestationCampaign');
    await campaignTimeout(() => query(
      `INSERT INTO "${schema}".attestation_campaigns
         (campaign_id, policy_id, title, status, due_date, audience_scope, created_at)
       VALUES ($1, $2, $3, 'active', $4, $5, NOW())`,
      [campaignId, policyId, `Attestation: ${policyTitle}`, dueDate, audienceScope],
    ));

    // Query users matching the audience scope
    const usersTimeout = createTypedTimeout('db', 'queryAudienceUsers');
    const usersResult = await usersTimeout(() => query(
      `SELECT user_id FROM "${schema}".users WHERE status = 'active'`,
      [],
    ));

    // Insert attestation records for each user
    const insertTimeout = createTypedTimeout('db', 'insertAttestationRecords');
    for (const row of usersResult.rows) {
      await insertTimeout(() => query(
        `INSERT INTO "${schema}".attestation_records
           (record_id, campaign_id, user_id, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())`,
        [uuid(), campaignId, row.user_id],
      ));
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      action: 'create',
      entityType: 'attestation_campaign',
      entityId: campaignId,
      afterState: { policyId, userCount: usersResult.rows.length, dueDate },
    });

    return campaignId;
  } catch (err: unknown) {
    logger.error(`[Policy] createAutoAttestationCampaign failed: ${toErrorMessage(err)}`);
    throw err;
  }
}

/**
 * Send renewal reminders for an expiring policy exception.
 * Notifies the original requestor and all approval-chain members.
 */
export async function sendExceptionRenewalReminder(
  tenantId: string,
  exceptionId: string,
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    // Fetch exception details and related policy title
    const dbTimeout = createTypedTimeout('db', 'fetchExceptionDetails');
    const exceptionResult = await dbTimeout(() => query(
      `SELECT e.requested_by, e.policy_id, e.expires_at, p.title AS policy_title
       FROM "${schema}".policy_exception_requests e
       LEFT JOIN "${schema}".policies p ON e.policy_id = p.policy_id
       WHERE e.exception_id = $1`,
      [exceptionId],
    ));
    const exception = getFirstRow(exceptionResult);
    if (!exception) {
      logger.warn(`[Policy] sendExceptionRenewalReminder: exception ${exceptionId} not found`);
      return;
    }

    const policyTitle = exception.policy_title ?? 'Unknown Policy';
    const recipientIds: string[] = [];

    // Add the requestor
    if (exception.requested_by) {
      recipientIds.push(exception.requested_by);
    }

    // Add approvers from the exception approval chain
    const approversResult = await safeQuery(
      `SELECT DISTINCT approver_id
       FROM "${schema}".policy_exception_approvals
       WHERE exception_id = $1 AND approver_id IS NOT NULL`,
      [exceptionId],
    );
    for (const row of approversResult.rows) {
      if (!recipientIds.includes(row.approver_id)) {
        recipientIds.push(row.approver_id);
      }
    }

    // Send notifications
    const notifyTimeout = createTypedTimeout('api', 'sendRenewalReminders');
    for (const recipientId of recipientIds) {
      await notifyTimeout(() => createNotification(tenantId, {
        userId: recipientId,
        type: 'exception_renewal_reminder',
        title: `Exception Renewal Reminder: ${policyTitle}`,
        body: `The policy exception for "${policyTitle}" is approaching its expiry date (${exception.expires_at}). Please review and renew if necessary.`,
      }));
    }
  } catch (err: unknown) {
    logger.warn(`[Policy] sendExceptionRenewalReminder non-fatal: ${toErrorMessage(err)}`);
  }
}

/**
 * Auto-expire a policy exception that was not renewed.
 * Updates the exception status to 'expired' and notifies the requestor.
 * Emits a `policy_exception.expired` event.
 */
export async function autoExpireException(
  tenantId: string,
  exceptionId: string,
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    const dbTimeout = createTypedTimeout('db', 'autoExpireException');

    // Fetch requestor before update
    const exResult = await dbTimeout(() => query(
      `SELECT requested_by, policy_id FROM "${schema}".policy_exception_requests
       WHERE exception_id = $1`,
      [exceptionId],
    ));
    const exception = getFirstRow(exResult);

    // Expire the exception
    await dbTimeout(() => query(
      `UPDATE "${schema}".policy_exception_requests
       SET status = 'expired', updated_at = NOW()
       WHERE exception_id = $1`,
      [exceptionId],
    ));

    // Notify the requestor
    if (exception?.requested_by) {
      await createNotification(tenantId, {
        userId: exception.requested_by,
        type: 'exception_expired',
        title: 'Policy Exception Expired',
        body: `Your policy exception (${exceptionId}) has expired and is no longer active. If still needed, please submit a new exception request.`,
      });
    }

    // Emit event
    await emitEvent({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      event: 'policy_exception.expired',
      entityType: 'policy_exception',
      entityId: exceptionId,
      data: { status: 'expired', policyId: exception?.policy_id },
    });

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      action: 'update',
      entityType: 'policy_exception',
      entityId: exceptionId,
      afterState: { status: 'expired' },
    });
  } catch (err: unknown) {
    logger.error(`[Policy] autoExpireException failed: ${toErrorMessage(err)}`);
    throw err;
  }
}

/**
 * Escalate a policy review to the next level in the team escalation chain.
 * Finds the next escalation target, reassigns the review step, and sends
 * a high-priority notification.
 */
export async function escalatePolicyReview(
  tenantId: string,
  policyId: string,
  level: number,
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    // Find next escalation target from team_escalation_paths
    const dbTimeout = createTypedTimeout('db', 'resolveEscalationTarget');
    const escalationResult = await dbTimeout(() => query(
      `SELECT ep.escalation_user_id, ep.team_id
       FROM "${schema}".team_escalation_paths ep
       WHERE ep.scope_type = 'policy'
         AND ep.escalation_level = $1
         AND ep.escalation_user_id IS NOT NULL
       LIMIT 1`,
      [level],
    ));

    const target = getFirstRow(escalationResult);
    if (!target) {
      logger.warn(`[Policy] escalatePolicyReview: no escalation target for level ${level}`);
      return;
    }

    // Reassign incomplete review steps to the escalation target
    await dbTimeout(() => query(
      `UPDATE "${schema}".policy_process_actions
       SET assigned_to = $1, updated_at = NOW()
       WHERE policy_id = $2
         AND step_key IN ('internal_review', 'legal_review', 'compliance_review')
         AND status != 'completed'`,
      [target.escalation_user_id, policyId],
    ));

    // Fetch policy title for the notification
    const policyResult = await safeQuery(
      `SELECT title FROM "${schema}".policies WHERE policy_id = $1`,
      [policyId],
    );
    const policyTitle = getFirstRow(policyResult)?.title ?? 'Untitled Policy';

    // Send high-priority notification
    await createNotification(tenantId, {
      userId: target.escalation_user_id,
      type: 'policy_review_escalation',
      title: `[URGENT] Policy Review Escalated (Level ${level}): ${policyTitle}`,
      body: `The policy review for "${policyTitle}" has been escalated to level ${level} due to SLA timeout. Immediate action is required.`,
    });

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      action: 'update',
      entityType: 'policy',
      entityId: policyId,
      afterState: { escalation_level: level, escalation_user_id: target.escalation_user_id },
    });
  } catch (err: unknown) {
    logger.warn(`[Policy] escalatePolicyReview non-fatal: ${toErrorMessage(err)}`);
  }
}

/**
 * Notify the policy author that their policy was rejected, including
 * the rejection reason. Reverts the policy status back to 'draft'.
 */
export async function notifyPolicyRejection(
  tenantId: string,
  policyId: string,
  reason: string,
): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    const dbTimeout = createTypedTimeout('db', 'fetchPolicyAuthor');

    // Fetch the policy author and title
    const policyResult = await dbTimeout(() => query(
      `SELECT created_by, title FROM "${schema}".policies WHERE policy_id = $1`,
      [policyId],
    ));
    const policy = getFirstRow(policyResult);
    const authorId = policy?.created_by;
    const policyTitle = policy?.title ?? 'Untitled Policy';

    // Revert policy status to draft
    await dbTimeout(() => query(
      `UPDATE "${schema}".policies
       SET status = 'draft', approval_status = 'rejected', updated_at = NOW()
       WHERE policy_id = $1`,
      [policyId],
    ));

    // Notify the author
    if (authorId) {
      await createNotification(tenantId, {
        userId: authorId,
        type: 'policy_rejected',
        title: `Policy Rejected: ${policyTitle}`,
        body: `Your policy "${policyTitle}" has been rejected. Reason: ${reason}. Please revise and resubmit.`,
      });
    }

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'policy',
      action: 'update',
      entityType: 'policy',
      entityId: policyId,
      afterState: { status: 'draft', approval_status: 'rejected', reason },
    });
  } catch (err: unknown) {
    logger.warn(`[Policy] notifyPolicyRejection non-fatal: ${toErrorMessage(err)}`);
  }
}
