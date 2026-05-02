// ============================================
// Quality Gate Worker — Temporal
// Processes quality gate workflow tasks.
// PM2 config: fork mode, 1 instance.
// ============================================

import { NativeConnection, Worker } from '@temporalio/worker';
import { TASK_QUEUES } from '../config/queues.js';
import * as qualityGateActivities from '../activities/quality-gate.activities.js';
import pino from 'pino';

const logger = pino({ name: 'quality-gate-worker' });

async function run(): Promise<void> {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  logger.info({ address, namespace }, '[QualityGateWorker] Connecting to Temporal...');

  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: TASK_QUEUES.QUALITY_GATE,
    workflowsPath: require.resolve('../workflows/platform/quality-gate-run.workflow'),
    activities: qualityGateActivities,
    maxConcurrentActivityTaskExecutions: 3,
    maxConcurrentWorkflowTaskExecutions: 3,
  });

  logger.info(`[QualityGateWorker] Listening on queue "${TASK_QUEUES.QUALITY_GATE}"`);

  const shutdown = async (): Promise<void> => {
    logger.info('[QualityGateWorker] Shutting down...');
    worker.shutdown();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await worker.run();
  logger.info('[QualityGateWorker] Worker stopped.');
  await connection.close();
}

run().catch((err) => {
  logger.error({ err }, '[QualityGateWorker] Fatal error');
  process.exit(1);
});
