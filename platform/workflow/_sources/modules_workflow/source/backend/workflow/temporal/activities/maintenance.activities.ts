/**
 * @owner DOS (platform maintenance)
 * @layer temporal-activity
 */
import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
import { safeQuery, assertTenantId } from '@dos/db';
import { executeJobByName } from '@dos/platform-core/jobs';
import { toErrorMessage } from '@dos/platform-core/resilience';

async function safeExec(text: string, params?: unknown[]): Promise<number> {
  try { const r = await safeQuery(text, params); return r.rowCount ?? 0; } catch { return 0; }
}

export async function runDataRetention(tenantId: string): Promise<{ rowsDeleted: number }> {
  assertTenantId(tenantId);
  try {
    const retentionDays = 365;
    const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString();
    const deleted = await safeExec(
      `DELETE FROM agrc_event_log WHERE tenant_id = $1 AND created_at < $2`,
      [tenantId, cutoff]
    );
    return { rowsDeleted: deleted };
  } catch (err: unknown) {
    logger.warn(`[Maintenance] data-retention non-fatal: ${toErrorMessage(err)}`);
    return { rowsDeleted: 0 };
  }
}

export async function retryDeadLetterQueue(tenantId: string): Promise<{ jobsRetried: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('dlq-retry');
    return { jobsRetried: 1 };
  } catch (err: unknown) {
    logger.warn(`[Maintenance] dlq-retry non-fatal: ${toErrorMessage(err)}`);
    return { jobsRetried: 0 };
  }
}

export async function runReviewCycle(tenantId: string): Promise<{ itemsReviewed: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('review-cycle');
    return { itemsReviewed: 1 };
  } catch (err: unknown) {
    logger.warn(`[Maintenance] review-cycle non-fatal: ${toErrorMessage(err)}`);
    return { itemsReviewed: 0 };
  }
}

export async function runPolicyReview(tenantId: string): Promise<{ policiesReviewed: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('policy-review-cycle');
    return { policiesReviewed: 1 };
  } catch (err: unknown) {
    logger.warn(`[Maintenance] policy-review non-fatal: ${toErrorMessage(err)}`);
    return { policiesReviewed: 0 };
  }
}

export async function runVendorReassessment(tenantId: string): Promise<{ vendorsReassessed: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('vendor-reassessment');
    return { vendorsReassessed: 1 };
  } catch (err: unknown) {
    logger.warn(`[Maintenance] vendor-reassess non-fatal: ${toErrorMessage(err)}`);
    return { vendorsReassessed: 0 };
  }
}

export async function runGovAutoEscalation(tenantId: string): Promise<{ escalationsProcessed: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('governance-auto-escalation');
    return { escalationsProcessed: 1 };
  } catch (err: unknown) {
    logger.warn(`[Maintenance] gov-escalation non-fatal: ${toErrorMessage(err)}`);
    return { escalationsProcessed: 0 };
  }
}
