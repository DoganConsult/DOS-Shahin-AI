// ============================================
// SLA Worker — Temporal
// Handles: per-task SLA timer workflows
// Queue: agrc-sla
// PM2: fork mode, 1 instance
// ============================================

import { Worker, NativeConnection } from '@temporalio/worker';
import * as slaActivities from '../activities/sla.activities.js';
import { TASK_QUEUES } from '../config/queues.js';
import { logger } from '@dos/platform-core/observability';

async function run() {
  if (process.env.TEMPORAL_ENABLED !== 'true') {
    logger.info('[temporal:sla-worker] disabled — set TEMPORAL_ENABLED=true to activate.');
    return;
  }
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  logger.info(`[temporal:sla-worker] connecting to ${address}/${namespace}`);
  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: TASK_QUEUES.SLA,
    workflowsPath: require.resolve('../workflows/platform/sla-timer.workflow'),
    activities: slaActivities,
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 50,
  });

  logger.info(`[temporal:sla-worker] started on queue=${TASK_QUEUES.SLA}`);

  // Graceful shutdown on process signals
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[temporal:sla-worker] Received ${signal}, shutting down...`);
    try {
      worker.shutdown();
      const { tenantConnectionResolver } = await import('../../config/tenant-connection-resolver.js');
      const { closePool } = await import('../../config/database.js');
      await tenantConnectionResolver.shutdown();
      await closePool();
      logger.info(`[temporal:sla-worker] Graceful shutdown complete`);
      process.exit(0);
    } catch (err: unknown) {
      logger.error(`[temporal:sla-worker] Graceful shutdown failed`, { detail: err });
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await worker.run();
}

run().catch((err) => {
  logger.error('[temporal:sla-worker] fatal', { detail: err });
  process.exit(1);
});
