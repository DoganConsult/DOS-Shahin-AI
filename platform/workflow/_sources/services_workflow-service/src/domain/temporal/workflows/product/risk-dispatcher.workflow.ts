// ============================================
// Risk Remediation Dispatcher Workflow
// Finds active risks needing remediation and triggers
// riskRemediationWorkflow for each.
// Called by Temporal Schedule.
// ============================================

import type * as activities from '../../activities/risk.activities';
import { riskRemediationWorkflow } from './risk-remediation.workflow';
import { proxyActivities, executeChild } from '@temporalio/workflow';
import { TASK_QUEUES } from '../../config/queues';
import type { RiskRemediationInput } from './risk-remediation.workflow';

const { findActiveRisksNeedingRemediation } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '2s',
    backoffCoefficient: 2,
  },
});

/**
 * Dispatcher workflow that finds active risks needing remediation and triggers
 * riskRemediationWorkflow for each.
 * Called by Temporal Schedule: risk-remediation-monitor
 */
export async function riskRemediationDispatcherWorkflow(): Promise<{
  risksFound: number;
  workflowsTriggered: number;
}> {
  // Find all active risks that need remediation
  const active = await findActiveRisksNeedingRemediation();

  let workflowsTriggered = 0;

  // Trigger risk remediation workflow for each active risk
  for (const risk of active.risks) {
    const input: RiskRemediationInput = {
      tenantId: risk.tenantId,
      riskId: risk.riskId,
      treatmentPlanId: risk.treatmentPlanId,
      treatmentStrategy: risk.treatmentStrategy,
      slaHours: risk.slaHours ?? 168, // Default 7 days
    };

    await executeChild(riskRemediationWorkflow, {
      args: [input],
      taskQueue: TASK_QUEUES.RISK,
      workflowId: `risk-remediation-${risk.riskId}-${Date.now()}`,
    });

    workflowsTriggered++;
  }

  return {
    risksFound: active.risks.length,
    workflowsTriggered,
  };
}
