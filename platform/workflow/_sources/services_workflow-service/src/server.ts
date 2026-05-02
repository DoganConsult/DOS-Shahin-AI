import { createServiceServer, loadModuleRoute } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { setEventBus } from '@dos/module-sdk';
import {
  routes,
  workItemRoutes,
  autonomousRoutes,
  workflowsRootRoutes,
  bulkTasksRoutes,
  taskBoardRoutes,
  reviewCycleRoutes,
  processTasksRoutes,
  journeyRoutes,
  approvalRequestsRoutes,
  approvalRoutingRoutes,
  moduleWorkflowRoutes,
  moduleAiOrchestratorRoutes,
  cooperativeWorkflowsRoutes,
  workflowChainRoutes,
  approvalsRootRouter,
} from './routes/index';

// Phase-12E wire-closure: host modules/playbooks at /api/playbooks.
// Backed by modules/playbooks route file (templates + executions).
// modules/playbooks compiles with rootDir=source/backend so its routes land
// at dist/playbooks/routes/ (no intermediate 'backend/' segment). Point the
// loader at the actual emitted path.
const playbooksRouter = loadModuleRoute(
  'playbooks/playbooks',
  '../../../modules/playbooks/dist/playbooks/routes/playbooks.routes',
);
import { initConsumers } from './events/consumer';
import { startCronExecutor } from './domain/cron-executor';
import { getTemporalClient } from './domain/temporal/client';
import { verifyWorkflowSchema } from './domain/schema-check';

const SERVICE_CODE = 'workflow-service';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
    logger,
  });
  setEventBus(eventBus as any);

  initConsumers();

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api/workflow', router: routes },
      { path: '/api/work-items', router: workItemRoutes },
      // Autonomous-workflow AI review queue: frontend ai-queue.component.ts
      // calls /api/autonomous/workflows/ai-queue and .../review. Extracted from
      // modules/workflow/dist/workflow/services/autonomous-workflow/review-queue.ts.
      { path: '/api/autonomous', router: autonomousRoutes },
      // Phase-12E wire-closure: playbooks vertical (templates + executions).
      { path: '/api/playbooks', router: playbooksRouter },
      // V1 / Workflow vertical — top-level FE prefixes wired to extracted
      // modules/workflow/dist/workflow/routes/misc handlers. Each is a thin
      // alias that reuses the router already mounted under /api/workflow/*,
      // so Shahin calls resolve at the shape FE emits them.
      { path: '/api/workflows', router: workflowsRootRoutes },
      { path: '/api/bulk-tasks', router: bulkTasksRoutes },
      { path: '/api/task-board', router: taskBoardRoutes },
      { path: '/api/review-cycle', router: reviewCycleRoutes },
      { path: '/api/process-tasks', router: processTasksRoutes },
      { path: '/api/journey', router: journeyRoutes },
      { path: '/api/approval-requests', router: approvalRequestsRoutes },
      { path: '/api/approval-routing', router: approvalRoutingRoutes },
      { path: '/api/module-workflow', router: moduleWorkflowRoutes },
      { path: '/api/module-ai-orchestrator', router: moduleAiOrchestratorRoutes },
      { path: '/api/cooperative-workflows', router: cooperativeWorkflowsRoutes },
      { path: '/api/workflow-chains', router: workflowChainRoutes },
      // V2b — top-level /api/approvals alias over the same approval router
      // already mounted at /api/workflow/approvals. Shahin approvals-api
      // service.ts calls /api/approvals/:id/approve directly.
      { path: '/api/approvals', router: approvalsRootRouter },
    ],
    healthChecks: {
      database: async () => {
        try {
          const { query } = await import('@dos/db');
          const result = await query('SELECT 1');
          return !!result;
        } catch { return false; }
      },
    },
  });

  await start();

  // Verify canonical workflow table schema before accepting traffic
  const schemaCheck = await verifyWorkflowSchema();
  if (!schemaCheck.ok) {
    console.error(`[${SERVICE_CODE}] SCHEMA DRIFT DETECTED — missing columns:`, schemaCheck.missing);
    console.error(`[${SERVICE_CODE}] Run migration 022 to reconcile workflow tables.`);
  }

  startCronExecutor();

  if (process.env.TEMPORAL_ENABLED === 'true') {
    console.log('[workflow-service] TEMPORAL_ENABLED=true. Bootstrapping Temporal Client & Workers...');
    try {
      const temporalClient = await getTemporalClient();
      console.log(`[workflow-service] Temporal connection established at ${process.env.TEMPORAL_ADDRESS}`);
      
      // Optionally start workers in background if needed
      // import { runAllWorkers } from './domain/temporal/workers/index';
      // runAllWorkers().catch(console.error);

    } catch (err) {
      console.error('[workflow-service] Failed to bootstrap Temporal:', err);
    }
  } else {
    console.log('[workflow-service] TEMPORAL_ENABLED=false. Temporal features bypass active.');
  }
}

main().catch(err => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});
