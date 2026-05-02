// ============================================
// Evidence Worker — Temporal
// Handles: per-control evidence lifecycle workflows
// Queue: agrc-evidence
// PM2: fork mode, 1 instance
// ============================================

import { Worker, NativeConnection } from '@temporalio/worker';
import * as evidenceActivities from '../activities/evidence.activities.js';
import { TASK_QUEUES } from '../config/queues.js';
import { logger } from '../../modules/governance-os/platform/services/misc/logger.service.js';

async function run() {
  if (process.env.TEMPORAL_ENABLED !== 'true') {
    logger.info('[temporal:evidence-worker] disabled — set TEMPORAL_ENABLED=true to activate.');
    return;
  }
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  logger.info(`[temporal:evidence-worker] connecting to ${address}/${namespace}`);
  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: TASK_QUEUES.EVIDENCE,
    workflowsPath: require.resolve('../workflows/product/evidence-lifecycle.workflow'),
    activities: evidenceActivities,
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 20,
  });

  logger.info(`[temporal:evidence-worker] started on queue=${TASK_QUEUES.EVIDENCE}`);

  // Graceful shutdown on process signals
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[temporal:evidence-worker] Received ${signal}, shutting down...`);
    try {
      worker.shutdown();
      const { tenantConnectionResolver } = await import('../../config/tenant-connection-resolver.js');
      const { closePool } = await import('../../config/database.js');
      await tenantConnectionResolver.shutdown();
      await closePool();
      logger.info(`[temporal:evidence-worker] Graceful shutdown complete`);
      process.exit(0);
    } catch (err: unknown) {
      logger.error(`[temporal:evidence-worker] Graceful shutdown failed`, { detail: err });
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await worker.run();
}

run().catch((err) => {
  logger.error('[temporal:evidence-worker] fatal', { detail: err });
  process.exit(1);
});
