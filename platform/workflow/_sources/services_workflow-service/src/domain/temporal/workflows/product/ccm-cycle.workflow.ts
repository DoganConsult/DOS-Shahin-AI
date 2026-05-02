import { proxyActivities } from '@temporalio/workflow';
import type { CcmCycleInput, CcmCycleResult } from '../../types/workflow-types';

interface CcmActivities {
  runCcmWorker(tenantId: string): Promise<{ controlsChecked: number }>;
}

const acts = proxyActivities<CcmActivities>({
  startToCloseTimeout: '10m',
  retry: { initialInterval: '5s', backoffCoefficient: 2, maximumAttempts: 3 },
});

export async function ccmCycleWorkflow(input: CcmCycleInput): Promise<CcmCycleResult> {
  const startMs = Date.now();
  const { tenantId } = input;

  const result = await acts.runCcmWorker(tenantId);

  return {
    tenantId,
    controlsChecked: result.controlsChecked,
    failuresDetected: 0,
    durationMs: Date.now() - startMs,
  };
}
