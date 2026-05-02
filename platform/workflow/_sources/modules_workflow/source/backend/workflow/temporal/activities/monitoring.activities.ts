import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
import { assertTenantId } from '@dos/db';
import { executeJobByName } from '@dos/platform-core/jobs';
import { toErrorMessage } from '@dos/platform-core/resilience';
import type { GenericRow } from '@dos/types';

export async function checkProcessTaskSlas(tenantId: string): Promise<{ tasksChecked: number; breachesDetected: number }> {
  assertTenantId(tenantId);
  try {
    const { checkProcessTaskSLAs } = await import('../../services/tasks/process-task-monitor.service.js');
    const result = await checkProcessTaskSLAs(tenantId);
    return { tasksChecked: (result?.breached ?? 0) + (result?.warnings ?? 0), breachesDetected: result?.breached ?? 0 };
  } catch (err: unknown) {
    logger.warn(`[Monitoring] SLA check non-fatal: ${toErrorMessage(err)}`);
    return { tasksChecked: 0, breachesDetected: 0 };
  }
}

export async function checkConnectorHealth(tenantId: string): Promise<{ connectorsChecked: number; unhealthy: number }> {
  assertTenantId(tenantId);
  try {
    const { getHealthDashboard } = await import('../../modules/integrations/services/connector.service.js');
    const health = await getHealthDashboard(tenantId);
    const unhealthy = (health || []).filter((c: GenericRow) => c.status !== 'healthy').length;
    return { connectorsChecked: (health || []).length, unhealthy };
  } catch (err: unknown) {
    logger.warn(`[Monitoring] connector health non-fatal: ${toErrorMessage(err)}`);
    return { connectorsChecked: 0, unhealthy: 0 };
  }
}

export async function runEscalationCheck(tenantId: string): Promise<{ escalationsProcessed: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('escalation-check');
    return { escalationsProcessed: 1 };
  } catch (err: unknown) {
    logger.warn(`[Monitoring] escalation non-fatal: ${toErrorMessage(err)}`);
    return { escalationsProcessed: 0 };
  }
}

export async function runCcmWorker(tenantId: string): Promise<{ controlsChecked: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('ccm-worker');
    return { controlsChecked: 1 };
  } catch (err: unknown) {
    logger.warn(`[Monitoring] ccm non-fatal: ${toErrorMessage(err)}`);
    return { controlsChecked: 0 };
  }
}

export async function runAutonomousStepProcessor(tenantId: string): Promise<{ stepsProcessed: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('autonomous-step-processor');
    return { stepsProcessed: 1 };
  } catch (err: unknown) {
    logger.warn(`[Monitoring] auto-steps non-fatal: ${toErrorMessage(err)}`);
    return { stepsProcessed: 0 };
  }
}
