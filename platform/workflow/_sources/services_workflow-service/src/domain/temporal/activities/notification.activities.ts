/**
 * @owner DOS (platform notification scheduling)
 * @layer temporal-activity
 */
import { logger } from '@dos/platform-core/observability';
import { safeQuery, tenantSchema, assertTenantId } from '@dos/db';
import { createNotification } from '../../../adapters/notification.adapter';
import { executeJobByName } from '@dos/platform-core/jobs';
import { toErrorMessage } from '@dos/platform-core/resilience';
import type { GenericRow } from '@dos/types';

async function safeRows(text: string, params?: unknown[]): Promise<GenericRow[]> {
  try { const r = await safeQuery(text, params); return r.rows; } catch { return []; }
}

export async function checkDeadlineNotifications(tenantId: string): Promise<{ notificationsSent: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('deadline-notification-check');
    return { notificationsSent: 1 };
  } catch (err: unknown) {
    logger.warn(`[Notification] deadline-check non-fatal: ${toErrorMessage(err)}`);
    return { notificationsSent: 0 };
  }
}

export async function checkEvidenceExpiry(tenantId: string): Promise<{ expiredCount: number; notificationsSent: number }> {
  assertTenantId(tenantId);
  try {
    const s = tenantSchema(tenantId);
    const expired = await safeRows(
      `SELECT e.evidence_id, e.control_id, c.owner_user_id, c.name AS control_name
       FROM "${s}".evidence e
       JOIN "${s}".ucf_controls c ON e.control_id = c.id
       WHERE e.expires_at < NOW() AND e.status = 'active'
       LIMIT 50`,
    );
    let sent = 0;
    for (const row of expired) {
      if (row.owner_user_id) {
        await createNotification(tenantId, {
          userId: String(row.owner_user_id),
          type: 'evidence_expired',
          title: 'Evidence Expired',
          body: `Evidence for control "${row.control_name}" has expired and needs renewal.`,
        }).catch((e: any) => { logger.warn('[Notification] non-critical failure:', e); });
        sent++;
      }
      await safeQuery(`UPDATE "${s}".evidence SET status = 'expired' WHERE evidence_id = $1`, [row.evidence_id]).catch((e: any) => { logger.warn('[Notification] evidence update failed:', e); });
    }
    return { expiredCount: expired.length, notificationsSent: sent };
  } catch (err: unknown) {
    logger.warn(`[Notification] evidence-expiry non-fatal: ${toErrorMessage(err)}`);
    return { expiredCount: 0, notificationsSent: 0 };
  }
}

export async function checkPolicyReviewDeadlines(tenantId: string): Promise<{ overdueCount: number; notificationsSent: number }> {
  assertTenantId(tenantId);
  try {
    const s = tenantSchema(tenantId);
    const overdue = await safeRows(
      `SELECT p.policy_id, p.title, p.owner
       FROM "${s}".policies p
       WHERE p.review_date < NOW() AND p.status = 'published'
       LIMIT 30`,
    );
    let sent = 0;
    for (const row of overdue) {
      if (row.owner) {
        await createNotification(tenantId, {
          userId: String(row.owner),
          type: 'policy_review_overdue',
          title: 'Policy Review Overdue',
          body: `Policy "${row.title}" is overdue for review.`,
        }).catch((e: any) => { logger.warn('[Notification] non-critical failure:', e); });
        sent++;
      }
    }
    return { overdueCount: overdue.length, notificationsSent: sent };
  } catch (err: unknown) {
    logger.warn(`[Notification] policy-review non-fatal: ${toErrorMessage(err)}`);
    return { overdueCount: 0, notificationsSent: 0 };
  }
}

export async function runIncidentFollowup(tenantId: string): Promise<{ incidentsFollowedUp: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('incident-followup');
    return { incidentsFollowedUp: 1 };
  } catch (err: unknown) {
    logger.warn(`[Notification] incident-followup non-fatal: ${toErrorMessage(err)}`);
    return { incidentsFollowedUp: 0 };
  }
}
