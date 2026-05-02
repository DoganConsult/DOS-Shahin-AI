// AI-OS Temporal Worker
//
// Polls the `ai-os-task-queue` and runs activity implementations from
// ./activities.ts. The worker MUST mirror main.ts boot so that activities
// can use the EventBus, DB pool and Redis exactly like the REST runtime.
// Without this, activities crash with `[DOS-SDK] EventBus not initialized`.

import * as http from 'node:http';
import { NativeConnection, Worker } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as activities from './activities.js';
import { logger } from '@dos/platform-core/observability';
import { setEventBus, type PlatformEvent } from '@dos/module-sdk';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';

const ADDRESS = process.env.TEMPORAL_ADDRESS || '127.0.0.1:7233';
const NAMESPACE = process.env.TEMPORAL_NAMESPACE || 'ai-os';
const TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || 'ai-os-task-queue';
// Concurrency tuning. Defaults: 20 in-flight activities, 10 in-flight
// workflow tasks. Override via env when sizing for a heavier LLM mix
// (lower) or a polling-heavy mix (higher).
const MAX_CONCURRENT_ACTIVITIES = parseInt(process.env.TEMPORAL_MAX_CONCURRENT_ACTIVITIES || '20', 10);
const MAX_CONCURRENT_WORKFLOW_TASKS = parseInt(process.env.TEMPORAL_MAX_CONCURRENT_WORKFLOW_TASKS || '10', 10);
// In-process worker count. Temporal SDK rejects multiple workers with
// overlapping task types on the same (namespace, task queue, build_id),
// so the safe ceiling per process is 1. For horizontal scaling launch
// a second `ai-temporal-worker` PM2 process — each gets its own worker
// instance with full MAX_CONCURRENT_ACTIVITIES capacity, and Temporal
// load-balances task dispatch across them.
const WORKER_INSTANCES = Math.max(1, Math.min(1, parseInt(process.env.TEMPORAL_WORKER_INSTANCES || '1', 10)));
const HEALTH_PORT = parseInt(process.env.TEMPORAL_WORKER_HEALTH_PORT || '4313', 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKFLOWS_PATH = path.join(__dirname, 'workflows.js');

interface WorkerHandle { worker: Worker; instance: number; }
const _runningWorkers: WorkerHandle[] = [];
let _bootstrapErrors: string[] = [];
let _temporalConnected = false;
let _bootstrapAt: number = Date.now();

function initWorkerEventBus(serviceCode: string): void {
  const config = loadServiceConfig(serviceCode);
  const backbone = createEventBackbone({ redisUrl: config.redis.url, serviceCode });
  const afterPublishHandlers = new Map<string, (event: PlatformEvent) => Promise<void> | void>();

  setEventBus({
    publish: async (event: PlatformEvent) => {
      const eventId = await backbone.publish(event.eventType, event.payload, {
        tenantId: event.tenantId,
        userId: event.userId,
        idempotencyKey: (event as any).idempotencyKey || (event as any).correlationId,
      });
      for (const handler of afterPublishHandlers.values()) await handler(event);
      return eventId;
    },
    subscribe: (eventType: string, _subscriberId: string, handler: (event: PlatformEvent) => Promise<void>) => {
      backbone.subscribe(eventType, async (event) => {
        await handler({
          eventId: event.eventId,
          eventType: event.eventType,
          tenantId: event.tenantId,
          userId: event.userId,
          payload: event.payload,
          timestamp: event.timestamp,
          sourceService: event.source,
        } as PlatformEvent);
      });
    },
    onAfterPublish: (subscriberId: string, handler: (event: PlatformEvent) => Promise<void> | void) => {
      afterPublishHandlers.set(subscriberId, handler);
    },
  } as any);

  backbone.startConsuming().catch((error: Error) => {
    logger.error('[ai-os-temporal-worker] backbone consumer failed: ' + error.message);
  });
}

async function initWorkerDb(): Promise<void> {
  // @dos/db auto-initializes the pool on first getPool() lazily from
  // DATABASE_URL; we touch it here so that pool/connection failures
  // surface at worker startup, not inside the first activity.
  try {
    const { getPool } = await import('@dos/db');
    const pool = getPool();
    await pool.query('SELECT 1');
    logger.info('[ai-os-temporal-worker] @dos/db pool ready');
  } catch (err) {
    logger.warn('[ai-os-temporal-worker] @dos/db preflight failed: ' + (err as Error).message);
  }
}

// Lightweight HTTP health endpoint so PM2 / probes can tell whether the
// poller is actually consuming tasks (process-alive ≠ queue-being-drained).
// Bind is best-effort — a stale predecessor holding the port should not
// crash the new worker; we just skip the health endpoint and rely on PM2
// to recycle the orphan.
function startHealthServer(): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/ready') {
      const workerStates = _runningWorkers.map(h => ({
        instance: h.instance,
        state: typeof (h.worker as any).getState === 'function' ? (h.worker as any).getState() : 'unknown',
      }));
      const allRunning = workerStates.length > 0 && workerStates.every(s => s.state === 'RUNNING');
      const status = _temporalConnected && allRunning ? 'ok' : 'degraded';
      const body = {
        status,
        service: 'ai-temporal-worker',
        temporalConnected: _temporalConnected,
        taskQueue: TASK_QUEUE,
        namespace: NAMESPACE,
        workerInstances: workerStates,
        maxConcurrentActivities: MAX_CONCURRENT_ACTIVITIES,
        maxConcurrentWorkflowTasks: MAX_CONCURRENT_WORKFLOW_TASKS,
        bootstrapErrors: _bootstrapErrors,
        uptimeSeconds: Math.round((Date.now() - _bootstrapAt) / 1000),
      };
      res.writeHead(allRunning && _temporalConnected ? 200 : 503, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not-found' }));
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`[ai-os-temporal-worker] health port ${HEALTH_PORT} already bound — skipping (probably orphaned predecessor)`);
    } else {
      logger.warn(`[ai-os-temporal-worker] health server error: ${err.message}`);
    }
  });
  server.listen(HEALTH_PORT, '127.0.0.1', () => {
    logger.info(`[ai-os-temporal-worker] health endpoint listening on 127.0.0.1:${HEALTH_PORT}`);
  });
  // Graceful shutdown: close listener on SIGTERM/SIGINT so reload cycles
  // don't leave the port in TIME_WAIT/listening with the old PID.
  for (const sig of ['SIGTERM', 'SIGINT'] as const) {
    process.once(sig, () => { server.close(() => undefined); });
  }
}

async function run(): Promise<void> {
  startHealthServer();
  initWorkerEventBus('ai-engine-service');
  await initWorkerDb();
  // Re-use the engine's DSOC audit bridge so worker-side ai.* events
  // are mirrored to dsoc.audit.* (closes audit gap #8).
  try {
    const { installDSOCAuditBridge } = await import('../runtime/ai/bootstrap/dsoc-audit-bridge.js');
    const { wired } = installDSOCAuditBridge();
    logger.info(`[ai-os-temporal-worker] DSOC audit bridge wired (${wired} subscribers)`);
  } catch (err) {
    _bootstrapErrors.push(`dsoc-audit-bridge: ${(err as Error).message}`);
    logger.warn('[ai-os-temporal-worker] DSOC audit bridge install skipped: ' + (err as Error).message);
  }

  const connection = await NativeConnection.connect({ address: ADDRESS });
  _temporalConnected = true;

  // Create N worker instances on the same task queue. They share the
  // connection but each has independent activity slots — cumulative
  // capacity = WORKER_INSTANCES × MAX_CONCURRENT_ACTIVITIES.
  const created: Promise<void>[] = [];
  for (let i = 0; i < WORKER_INSTANCES; i++) {
    const worker = await Worker.create({
      connection,
      namespace: NAMESPACE,
      taskQueue: TASK_QUEUE,
      workflowsPath: WORKFLOWS_PATH,
      activities,
      maxConcurrentActivityTaskExecutions: MAX_CONCURRENT_ACTIVITIES,
      maxConcurrentWorkflowTaskExecutions: MAX_CONCURRENT_WORKFLOW_TASKS,
      identity: `ai-engine-worker-${process.pid}-${i}`,
    });
    _runningWorkers.push({ worker, instance: i });
    created.push(worker.run().catch(err => {
      logger.error(`[ai-os-temporal-worker:${i}] poller exited: ${(err as Error).message}`);
    }));
  }

  logger.info(`[ai-os-temporal-worker] ${WORKER_INSTANCES} worker(s) connected ${ADDRESS} ns=${NAMESPACE} queue=${TASK_QUEUE} (act=${MAX_CONCURRENT_ACTIVITIES}, wf=${MAX_CONCURRENT_WORKFLOW_TASKS})`);
  await Promise.all(created);
}

run().catch(err => {
  _temporalConnected = false;
  _bootstrapErrors.push(`fatal: ${(err as Error).message}`);
  logger.error('[ai-os-temporal-worker] fatal: ' + (err as Error).message);
  process.exit(1);
});
