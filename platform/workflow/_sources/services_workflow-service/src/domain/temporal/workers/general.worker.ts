// ============================================
// General Worker
// Handles: hello-world, migrated cron jobs,
//          governance-ai pipeline, periodic job
//          dispatcher, ccm-cycle
// Queue: agrc-general
// PM2: cluster mode, 2 instances
// ============================================

import { Worker, NativeConnection } from '@temporalio/worker';
import * as generalActivities from '../activities/general.activities.js';
import { logger } from '@dos/platform-core/observability';
import * as governanceAiActivities from '../activities/governance-ai.activities.js';
import * as monitoringActivities from '../activities/monitoring.activities.js';
import * as reportingActivities from '../activities/reporting.activities.js';
import * as maintenanceActivities from '../activities/maintenance.activities.js';
import * as notificationActivities from '../activities/notification.activities.js';
import * as integrationActivities from '../activities/integration.activities.js';
import { TASK_QUEUES } from '../config/queues.js';

async function run() {
  if (process.env.TEMPORAL_ENABLED !== 'true') {
    logger.info('[Temporal] General worker disabled — set TEMPORAL_ENABLED=true to activate.');
    return;
  }

  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: TASK_QUEUES.GENERAL,
    workflowsPath: require.resolve('../workflows/index.js'),
    activities: {
      ...generalActivities,
      ...governanceAiActivities,
      ...monitoringActivities,
      ...reportingActivities,
      ...maintenanceActivities,
      ...notificationActivities,
      ...integrationActivities,
    },
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 20,
  });

  logger.info(`[Temporal] General worker started on queue: ${TASK_QUEUES.GENERAL}`);

  let shuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[Temporal] Received ${signal}, starting graceful shutdown for general worker...`);
    try {
      worker.shutdown();
      const { tenantConnectionResolver } = await import('../../config/tenant-connection-resolver.js');
      const { closePool } = await import('../../config/database.js');
      await tenantConnectionResolver.shutdown();
      await closePool();
      logger.info(`[Temporal] General worker graceful shutdown complete`);
      process.exit(0);
    } catch (err: unknown) {
      logger.error(`[Temporal] Graceful shutdown failed`, { detail: err });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  await worker.run();
}

run().catch((err) => {
  logger.error('[Temporal] General worker failed', { detail: err });
  process.exit(1);
});
