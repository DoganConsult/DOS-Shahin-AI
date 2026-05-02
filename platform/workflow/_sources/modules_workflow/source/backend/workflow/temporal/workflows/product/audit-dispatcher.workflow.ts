// ============================================
// Audit Package Dispatcher Workflow
// Finds scheduled audit packages and triggers
// auditPackageWorkflow for each.
// Called by Temporal Schedule.
// ============================================

import type * as activities from '../../activities/audit.activities';
import { auditPackageWorkflow } from './audit-package.workflow';
import { proxyActivities, executeChild } from '@temporalio/workflow';
import { TASK_QUEUES } from '../../config/queues';
import type { AuditPackageInput } from './audit-package.workflow';

const { findScheduledAuditPackages } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5m',
  retry: {
    maximumAttempts: 3,
    initialInterval: '2s',
    backoffCoefficient: 2,
  },
});

/**
 * Dispatcher workflow that finds scheduled audit packages and triggers
 * auditPackageWorkflow for each.
 * Called by Temporal Schedule: audit-package-generation
 */
export async function auditPackageDispatcherWorkflow(): Promise<{
  packagesFound: number;
  workflowsTriggered: number;
}> {
  // Find all scheduled audit packages that need to be generated
  const scheduled = await findScheduledAuditPackages();

  let workflowsTriggered = 0;

  // Trigger audit package workflow for each scheduled package
  for (const pkg of scheduled.packages) {
    const input: AuditPackageInput = {
      tenantId: pkg.tenantId,
      packageId: `pkg-${pkg.frameworkVersionId}-${Date.now()}`,
      frameworkVersionId: pkg.frameworkVersionId,
      controlIds: pkg.controlIds,
      exportFormats: pkg.exportFormats || ['PDF', 'ZIP'],
      includeEvidence: pkg.includeEvidence ?? true,
      includeTraceability: pkg.includeTraceability ?? true,
    };

    await executeChild(auditPackageWorkflow, {
      args: [input],
      taskQueue: TASK_QUEUES.REPORTS,
      workflowId: `audit-package-${pkg.frameworkVersionId}-${Date.now()}`,
    });

    workflowsTriggered++;
  }

  return {
    packagesFound: scheduled.packages.length,
    workflowsTriggered,
  };
}
