// ============================================
// Assessment Automation Dispatcher Workflow
// Finds scheduled assessments and triggers
// assessmentAutomationWorkflow for each.
// Called by Temporal Schedule.
// ============================================

import type * as activities from '../../activities/assessment.activities';
import { assessmentAutomationWorkflow } from './assessment-automation.workflow';
import { proxyActivities, executeChild } from '@temporalio/workflow';
import { TASK_QUEUES } from '../../config/queues';
import type { AssessmentAutomationInput } from './assessment-automation.workflow';

const { findScheduledAssessments } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '2s',
    backoffCoefficient: 2,
  },
});

/**
 * Dispatcher workflow that finds scheduled assessments and triggers
 * assessmentAutomationWorkflow for each.
 * Called by Temporal Schedule: assessment-automation-periodic
 */
export async function assessmentDispatcherWorkflow(): Promise<{
  assessmentsFound: number;
  workflowsTriggered: number;
}> {
  // Find all scheduled assessments that need to run
  const scheduled = await findScheduledAssessments();

  let workflowsTriggered = 0;

  // Trigger assessment workflow for each scheduled assessment
  for (const assessment of scheduled.assessments) {
    const input: AssessmentAutomationInput = {
      tenantId: assessment.tenantId,
      assessmentId: assessment.assessmentId,
      frameworkVersionId: assessment.frameworkVersionId,
      controlIds: assessment.controlIds,
      assessmentType: assessment.assessmentType,
      autoRemediate: assessment.autoRemediate ?? true,
    };

    await executeChild(assessmentAutomationWorkflow, {
      args: [input],
      taskQueue: TASK_QUEUES.COMPLIANCE,
      workflowId: `assessment-${assessment.assessmentId}-${Date.now()}`,
    });

    workflowsTriggered++;
  }

  return {
    assessmentsFound: scheduled.assessments.length,
    workflowsTriggered,
  };
}
