// ============================================
// Gap Remediation Dispatcher Workflow
// Finds open gaps and triggers
// gapRemediationWorkflow for each assessment.
// Called by Temporal Schedule.
// ============================================

import type * as activities from '../../activities/gap.activities';
import { gapRemediationWorkflow } from './gap-remediation.workflow';
import { proxyActivities, executeChild } from '@temporalio/workflow';
import { TASK_QUEUES } from '../../config/queues';
import type { GapRemediationInput } from './gap-remediation.workflow';

const { findAssessmentsWithOpenGaps } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '2s',
    backoffCoefficient: 2,
  },
});

/**
 * Dispatcher workflow that finds assessments with open gaps and triggers
 * gapRemediationWorkflow for each.
 * Called by Temporal Schedule: gap-remediation-cycle
 */
export async function gapRemediationDispatcherWorkflow(): Promise<{
  assessmentsFound: number;
  workflowsTriggered: number;
}> {
  // Find all assessments with open gaps
  const assessments = await findAssessmentsWithOpenGaps();

  let workflowsTriggered = 0;

  // Trigger gap remediation workflow for each assessment
  for (const assessment of assessments.assessments) {
    const input: GapRemediationInput = {
      tenantId: assessment.tenantId,
      assessmentId: assessment.assessmentId,
      gapIds: assessment.gapIds,
      minPriority: assessment.minPriority || 'medium',
      autoAssign: assessment.autoAssign ?? true,
      slaHours: assessment.slaHours ?? 168, // Default 7 days
    };

    await executeChild(gapRemediationWorkflow, {
      args: [input],
      taskQueue: TASK_QUEUES.COMPLIANCE,
      workflowId: `gap-remediation-${assessment.assessmentId}-${Date.now()}`,
    });

    workflowsTriggered++;
  }

  return {
    assessmentsFound: assessments.assessments.length,
    workflowsTriggered,
  };
}
