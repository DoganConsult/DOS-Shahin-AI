// ============================================
// Reports Worker — Temporal
// Handles: audit-package generation workflows
// Queue: agrc-reports
// PM2: fork mode, 1 instance
// ============================================

import { Worker, NativeConnection } from '@temporalio/worker';
import * as auditActivities from '../activities/audit.activities.js';
import { TASK_QUEUES } from '../config/queues.js';
import { logger } from '@dos/platform-core/observability';

async function run() {
  if (process.env.TEMPORAL_ENABLED !== 'true') {
    logger.info('[temporal:reports-worker] disabled — set TEMPORAL_ENABLED=true to activate.');
    return;
  }
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  logger.info(`[temporal:reports-worker] connecting to ${address}/${namespace}`);
  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: TASK_QUEUES.REPORTS,
    workflowsPath: require.resolve('../workflows/index.js'),
    activities: auditActivities,
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 20,
  });

  logger.info(`[temporal:reports-worker] started on queue=${TASK_QUEUES.REPORTS}`);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[temporal:reports-worker] Received ${signal}, shutting down...`);
    try {
      worker.shutdown();
      const { tenantConnectionResolver } = await import('../../config/tenant-connection-resolver.js');
      const { closePool } = await import('../../config/database.js');
      await tenantConnectionResolver.shutdown();
      await closePool();
      logger.info(`[temporal:reports-worker] Graceful shutdown complete`);
      process.exit(0);
    } catch (err: unknown) {
      logger.error(`[temporal:reports-worker] Graceful shutdown failed`, { detail: err });
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await worker.run();
}

run().catch((err) => {
  logger.error('[temporal:reports-worker] fatal', { detail: err });
  process.exit(1);
});
