// ============================================
// Scheduled Job Workflow
// Generic wrapper that runs any registered cron
// job as a Temporal Scheduled Workflow.
// Used by register-all-schedules.ts to migrate
// all 48 node-cron jobs to Temporal Schedules.
// ============================================

import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../activities/general.activities';

const { executeScheduledJob } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '2s',
    backoffCoefficient: 2,
  },
});

/**
 * Executes a registered cron job by name via Temporal.
 * Called on a schedule defined in register-all-schedules.ts.
 *
 * @param jobName - The job name as registered in job-scheduler.service.ts
 * @returns Summary object with job name and completion timestamp
 */
export async function scheduledJobWorkflow(
  jobName: string
): Promise<{ jobName: string; result: string }> {
  const result = await executeScheduledJob(jobName);
  return { jobName, result };
}
