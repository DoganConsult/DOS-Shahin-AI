import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
import { assertTenantId } from '@dos/db';
import { executeJobByName } from '@dos/platform-core/jobs';
import { toErrorMessage } from '@dos/platform-core/resilience';

export async function syncErpConnectors(tenantId: string): Promise<{ syncedConnectors: number }> {
  assertTenantId(tenantId);
  try {
    const { getConnections, executeSyncJob } = await import('../../modules/integrations/services/erp-connector.service.js');
    const connections = await getConnections(tenantId);
    for (const conn of connections) await executeSyncJob(tenantId, conn.connectionId).catch(catchHandler(EC.EVENT_BUS, {}));
    return { syncedConnectors: 1 };
  } catch (err: unknown) {
    logger.warn(`[Integration] erp-sync non-fatal: ${toErrorMessage(err)}`);
    return { syncedConnectors: 0 };
  }
}

export async function runRegulatoryDeltaCheck(tenantId: string): Promise<{ deltaItemsFound: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('regulatory-delta-check');
    return { deltaItemsFound: 1 };
  } catch (err: unknown) {
    logger.warn(`[Integration] regulatory-delta non-fatal: ${toErrorMessage(err)}`);
    return { deltaItemsFound: 0 };
  }
}

export async function runAgrcOrchestration(tenantId: string): Promise<{ cyclesRun: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('agrc-os-orchestrator');
    return { cyclesRun: 1 };
  } catch (err: unknown) {
    logger.warn(`[Integration] agrc-orch non-fatal: ${toErrorMessage(err)}`);
    return { cyclesRun: 0 };
  }
}

export async function runAutoGrcEngine(tenantId: string): Promise<{ enginesRun: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('auto-grc-engine');
    return { enginesRun: 1 };
  } catch (err: unknown) {
    logger.warn(`[Integration] auto-grc non-fatal: ${toErrorMessage(err)}`);
    return { enginesRun: 0 };
  }
}

export async function runIntegrationCycle(tenantId: string): Promise<{ integrationsDone: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('cross-hub-integration');
    return { integrationsDone: 1 };
  } catch (err: unknown) {
    logger.warn(`[Integration] integration-cycle non-fatal: ${toErrorMessage(err)}`);
    return { integrationsDone: 0 };
  }
}
