// Job scheduler barrel for workflow-service/src/domain/temporal/activities/
// Re-exports canonical @dos/platform-core/jobs surface used by legacy workflow
// activity imports (`await import('../../platform/dos/jobs/job-scheduler.service.js')`).
import { createJobSchedulerImpl } from '@dos/platform-core/jobs';

export {
  getProvisionedTenants,
  configureJobScheduler,
  createJobSchedulerImpl,
} from '@dos/platform-core/jobs';

// A single service-local scheduler instance — lazy-initialised so importers
// don't pay the instantiation cost at module load.
let _instance: ReturnType<typeof createJobSchedulerImpl> | null = null;

function getScheduler(): ReturnType<typeof createJobSchedulerImpl> {
  if (!_instance) _instance = createJobSchedulerImpl();
  return _instance;
}

/**
 * Execute a registered job by name. Thin wrapper over the canonical
 * `PlatformJobs.executeJobByName` — kept as a free function so Temporal
 * activities can call it directly after a dynamic import.
 */
export async function executeJobByName(jobName: string): Promise<void> {
  await getScheduler().executeJobByName(jobName);
}
