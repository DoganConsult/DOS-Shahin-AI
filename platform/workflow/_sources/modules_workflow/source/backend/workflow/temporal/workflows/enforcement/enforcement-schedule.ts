/**
 * Enforcement Schedule Registration
 *
 * Registers the enforcement sweep as a Temporal scheduled workflow.
 * Runs daily at 03:00 UTC and can be triggered manually via API.
 *
 * @owner DOS
 */

import { getTemporalClient } from '../../client';
import { v4 as uuid } from 'uuid';

import { logger } from '../../../modules/governance-os/platform/services/misc/logger.service';

const SCHEDULE_ID = 'enforcement-daily-sweep';
const TASK_QUEUE = 'agrc-general';
const CRON = '0 3 * * *'; // Daily at 03:00 UTC

export async function registerEnforcementSchedule(): Promise<void> {
  try {
    const client = await getTemporalClient();
    const handle = client.schedule.getHandle(SCHEDULE_ID);

    // Check if schedule already exists
    try {
      await handle.describe();
      // Already exists — update cron if needed
      return;
    } catch {
      // Schedule doesn't exist — create it
    }

    await client.schedule.create({
      scheduleId: SCHEDULE_ID,
      spec: { cronExpressions: [CRON] },
      action: {
        type: 'startWorkflow',
        workflowType: 'enforcementSweep',
        args: [{ runId: `scheduled-${uuid()}`, triggeredBy: 'cron' }],
        taskQueue: TASK_QUEUE,
        workflowId: `enforcement-sweep-${Date.now()}`,
      },
    });
  } catch (err) {
    // Temporal may not be available — log and continue
    logger.warn(`[Enforcement] Failed to register Temporal schedule: ${(err as Error).message}`);
  }
}

export async function triggerEnforcementSweep(triggeredBy: string = 'manual'): Promise<string> {
  const runId = `manual-${uuid()}`;
  try {
    const client = await getTemporalClient();
    await client.workflow.start('enforcementSweep', {
      args: [{ runId, triggeredBy }],
      taskQueue: TASK_QUEUE,
      workflowId: `enforcement-sweep-${runId}`,
    });
    return runId;
  } catch (_err) {
    // Fallback: run bash enforcement directly if Temporal unavailable
    const { execSync } = require('child_process');
    const root = require('path').resolve(__dirname, '../../../..');
    execSync(`bash "${root}/tools/enforcement/enforce.sh" "${root}"`, { stdio: 'inherit' });
    return runId;
  }
}
