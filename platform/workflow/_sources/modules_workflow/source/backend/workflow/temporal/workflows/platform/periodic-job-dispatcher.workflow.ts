import { proxyActivities } from '@temporalio/workflow';
import type { PeriodicJobInput, PeriodicJobResult } from '../../types/workflow-types';

interface GeneralActivities {
  getProvisionedTenantIds(): Promise<string[]>;
  executeJobForTenant(jobName: string, tenantId: string): Promise<{ success: boolean; error?: string; durationMs: number }>;
}

const acts = proxyActivities<GeneralActivities>({
  startToCloseTimeout: '5m',
  retry: { initialInterval: '3s', backoffCoefficient: 2, maximumAttempts: 3, maximumInterval: '30s' },
});

export async function periodicJobDispatcherWorkflow(input: PeriodicJobInput): Promise<PeriodicJobResult> {
  const startMs = Date.now();
  const { jobName } = input;

  const tenantIds = await acts.getProvisionedTenantIds();

  const results = await Promise.allSettled(
    tenantIds.map(tenantId => acts.executeJobForTenant(jobName, tenantId)),
  );

  let errors = 0;
  for (const r of results) {
    if (r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)) errors++;
  }

  return {
    jobName,
    tenantsProcessed: tenantIds.length,
    errors,
    durationMs: Date.now() - startMs,
  };
}
