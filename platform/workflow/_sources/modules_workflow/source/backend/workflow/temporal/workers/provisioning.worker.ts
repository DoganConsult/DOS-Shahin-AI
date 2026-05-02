// ============================================
// Provisioning Worker — Temporal
// Handles: tenant provisioning workflows (29-step pipeline)
// Queue: agrc-provisioning
// PM2: fork mode, 1 instance
// ============================================

import { Worker, NativeConnection } from '@temporalio/worker';
import * as provisioningActivities from '../activities/provisioning.activities.js';
import { TASK_QUEUES } from '../config/queues.js';
import { logger } from '../../modules/governance-os/platform/services/misc/logger.service.js';

async function run() {
  if (process.env.TEMPORAL_ENABLED !== 'true') {
    logger.info('[Temporal] Provisioning worker disabled — set TEMPORAL_ENABLED=true to activate.');
    return;
  }

  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  logger.info(`[temporal:provisioning-worker] connecting to ${address}/${namespace}`);
  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: TASK_QUEUES.PROVISIONING,
    workflowsPath: require.resolve('../workflows/platform/provisioning.workflow'),
    activities: provisioningActivities,
    maxConcurrentActivityTaskExecutions: 2,
    maxConcurrentWorkflowTaskExecutions: 2,
  });

  logger.info(`[temporal:provisioning-worker] started on queue=${TASK_QUEUES.PROVISIONING}`);

  // Graceful shutdown on process signals
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[temporal:provisioning-worker] Received ${signal}, shutting down...`);
    try {
      worker.shutdown();
      const { tenantConnectionResolver } = await import('../../config/tenant-connection-resolver.js');
      const { closePool } = await import('../../config/database.js');
      await tenantConnectionResolver.shutdown();
      await closePool();
      logger.info(`[temporal:provisioning-worker] Graceful shutdown complete`);
      process.exit(0);
    } catch (err: unknown) {
      logger.error(`[temporal:provisioning-worker] Graceful shutdown failed`, { detail: err });
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await worker.run();
}

run().catch((err) => {
  logger.error('[temporal:provisioning-worker] fatal', { detail: err });
  process.exit(1);
});
