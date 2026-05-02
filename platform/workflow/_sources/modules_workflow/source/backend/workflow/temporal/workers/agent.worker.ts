// Agent Worker
// Handles: AI agent inference via LangGraph
// Queue: agrc-agent
// PM2: fork mode, 1 instance
//
// Registers agentInferenceCycleWorkflow,
// agentCycleDispatcherWorkflow, plus all
// agent + general activities (including
// getProvisionedTenantIds used by dispatcher).
// ============================================

import { Worker, NativeConnection } from '@temporalio/worker';
import * as agentActivities from '../activities/agent.activities.js';
import * as generalActivities from '../activities/general.activities.js';
import { TASK_QUEUES } from '../config/queues.js';
import { logger } from '../../modules/governance-os/platform/services/misc/logger.service.js';

async function run() {
  if (process.env.TEMPORAL_ENABLED !== 'true') {
    logger.info('[Temporal] Agent worker disabled — set TEMPORAL_ENABLED=true to activate.');
    return;
  }

  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: TASK_QUEUES.AGENT,
    workflowsPath: require.resolve('../workflows/agent-workflow-index'),
    activities: { ...agentActivities, ...generalActivities },
    maxConcurrentActivityTaskExecutions: 3,
    maxConcurrentWorkflowTaskExecutions: 3,
  });

  logger.info(`[Temporal] Agent worker started on queue: ${TASK_QUEUES.AGENT}`);

  let shuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[Temporal] Received ${signal}, starting graceful shutdown for agent worker...`);
    try {
      worker.shutdown();
      const { tenantConnectionResolver } = await import('../../config/tenant-connection-resolver.js');
      const { closePool } = await import('../../config/database.js');
      await tenantConnectionResolver.shutdown();
      await closePool();
      logger.info(`[Temporal] Agent worker graceful shutdown complete`);
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
  logger.error('[Temporal] Agent worker failed', { detail: err });
  process.exit(1);
});
