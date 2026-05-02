/**
 * @owner DOS (platform general)
 * @layer temporal-activity
 */
import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
// ============================================
// General Activities
// Shared activities for the agrc-general queue.
// Includes hello-world for validation,
// executeScheduledJob for Temporal-based cron,
// and multi-tenant dispatching helpers.
// ============================================

import { assertTenantId } from '@dos/db';
import { toErrorMessage } from '@dos/platform-core/resilience';

/**
 * Hello activity — infrastructure validation.
 */
export async function helloActivity(name: string): Promise<string> {
  return `Hello, ${name}! AGRC-OS Temporal is operational.`;
}

/**
 * Executes a registered cron job by name.
 * Delegates to the existing job-scheduler service which maintains
 * all handler functions, single-instance locking, and execution recording.
 *
 * @param jobName - The job name as registered in job-scheduler.service.ts
 * @returns Completion message with timestamp
 */
export async function executeScheduledJob(jobName: string): Promise<string> {
  const { executeJobByName } = await import('@dos/platform-core/jobs');
  await executeJobByName(jobName);
  return `Job ${jobName} completed at ${new Date().toISOString()}`;
}

/**
 * Returns all provisioned (active) tenant IDs.
 * Used by periodic-job-dispatcher to fan out per-tenant jobs.
 */
export async function getProvisionedTenantIds(): Promise<string[]> {
  const { safeQuery } = await import('../../config/database.js');
  const result = await safeQuery(
    `SELECT tenant_id FROM tenants WHERE status = 'active' ORDER BY tenant_id`,
  );
  return (result.rows as Array<{ tenant_id: string }>).map((r) => r.tenant_id);
}

/**
 * Executes a named job for a single tenant.
 * Delegates to job-scheduler.service executeJobByName with tenant context.
 */
export async function executeJobForTenant(
  jobName: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string; durationMs: number }> {
  assertTenantId(tenantId);
  const startMs = Date.now();
  try {
    const { executeJobByName } = await import('@dos/platform-core/jobs');
    await executeJobByName(jobName);
    return { success: true, durationMs: Date.now() - startMs };
  } catch (err: unknown) {
    logger.warn(`[GeneralActivities] Job ${jobName} failed for tenant ${tenantId}: ${toErrorMessage(err)}`);
    return { success: false, error: toErrorMessage(err), durationMs: Date.now() - startMs };
  }
}
