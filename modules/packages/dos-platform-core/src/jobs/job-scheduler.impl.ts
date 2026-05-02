import { randomUUID } from 'crypto';
import type { PlatformJobs, JobDefinition, JobInfo, JobExecution } from './jobs';

const scheduledTasks = new Map<string, ReturnType<typeof setInterval>>();
const runningJobs = new Set<string>();
const jobHandlers = new Map<string, () => Promise<void>>();
const staticJobDefinitions: JobDefinition[] = [];
const postJobHooks: Array<() => Promise<void>> = [];

let handlerOnlyMode = false;
let _queryFn: ((sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number }>) | null = null;
let _redisFn: (() => { set: (...args: any[]) => Promise<any>; eval: (...args: any[]) => Promise<any> }) | null = null;
let _redisConnectedFn: (() => boolean) | null = null;
let _loggerFn: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void; debug: (...args: any[]) => void } = console;

export function configureJobScheduler(opts: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number }>;
  getRedis?: () => any;
  redisConnected?: () => boolean;
  logger?: typeof _loggerFn;
}): void {
  _queryFn = opts.query;
  _redisFn = opts.getRedis || null;
  _redisConnectedFn = opts.redisConnected || null;
  if (opts.logger) _loggerFn = opts.logger;
}

function safeQuery(sql: string, params?: unknown[]) {
  if (!_queryFn) throw new Error('Job scheduler DB not configured');
  return _queryFn(sql, params).catch(() => ({ rows: [] as any[], rowCount: 0 }));
}

function cronMatches(expression: string, now: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5) return false;
  const [minPart, hourPart, domPart, monPart, dowPart] = parts;
  return fieldMatches(minPart, now.getMinutes())
    && fieldMatches(hourPart, now.getHours())
    && fieldMatches(domPart, now.getDate())
    && fieldMatches(monPart, now.getMonth() + 1)
    && fieldMatches(dowPart, now.getDay());
}

function fieldMatches(field: string, value: number): boolean {
  if (field === '*') return true;
  if (field.includes('/')) {
    const [, step] = field.split('/');
    return value % parseInt(step) === 0;
  }
  if (field.includes(',')) {
    return field.split(',').some((v) => parseInt(v) === value);
  }
  if (field.includes('-')) {
    const [min, max] = field.split('-').map(Number);
    return value >= min && value <= max;
  }
  return parseInt(field) === value;
}

const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

async function executeJob(name: string, handler: () => Promise<void>): Promise<void> {
  const lockKey = `job:lock:${name}`;
  const lockToken = randomUUID();
  let usedRedisLock = false;

  try {
    if (_redisConnectedFn?.() && _redisFn) {
      const redis = _redisFn();
      const acquired = await redis.set(lockKey, lockToken, "PX", 300000, "NX");
      if (!acquired) {
        _loggerFn.info(`[JobScheduler] Skipping ${name} — distributed lock held by another worker`);
        return;
      }
      usedRedisLock = true;
    }
  } catch (redisErr: unknown) {
    _loggerFn.warn(`[JobScheduler] Redis lock unavailable for ${name}, using process-local lock`);
  }

  if (!usedRedisLock) {
    if (runningJobs.has(name)) {
      _loggerFn.info(`[JobScheduler] Skipping ${name} — already running (process-local)`);
      return;
    }
  }

  runningJobs.add(name);
  const startTime = Date.now();

  const newExecutionId = randomUUID();
  const execResult = await safeQuery(
    `INSERT INTO dos.job_executions (execution_id, job_id, status) VALUES ($1, $2, 'running') RETURNING execution_id`,
    [newExecutionId, name],
  );
  const executionId = execResult.rows[0]?.execution_id ?? newExecutionId;

  try {
    await handler();
    const durationMs = Date.now() - startTime;

    await safeQuery(
      `UPDATE dos.job_executions SET status = 'success', completed_at = NOW(), result = jsonb_build_object('duration_ms', $1::int) WHERE execution_id = $2`,
      [durationMs, executionId],
    );

    _loggerFn.info(`[JobScheduler] ${name} completed in ${durationMs}ms`);
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    await safeQuery(
      `UPDATE dos.job_executions SET status = 'failed', completed_at = NOW(), error = $1, result = jsonb_build_object('duration_ms', $2::int) WHERE execution_id = $3`,
      [errorMessage, durationMs, executionId],
    );

    _loggerFn.error(`[JobScheduler] ${name} failed: ${errorMessage}`);
  } finally {
    runningJobs.delete(name);

    if (usedRedisLock && _redisFn) {
      try {
        const redis = _redisFn();
        await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, lockToken);
      } catch (releaseErr: unknown) {
        _loggerFn.warn(`[JobScheduler] Failed to release Redis lock for ${name}`);
      }
    }
  }
}

async function registerAllJobDefinitions(): Promise<void> {
  for (const job of staticJobDefinitions) {
    const jobKey = job.name;
    await registerJobImpl(jobKey, job.cron, job.handler);
  }
  _loggerFn.info(`[JobScheduler] ${staticJobDefinitions.length} jobs registered`);

  for (const hook of postJobHooks) {
    try { await hook(); } catch (err: unknown) {
      _loggerFn.error(`[JobScheduler] Post-job hook failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function registerJobImpl(name: string, cronExpression: string, handler: () => Promise<void>): Promise<void> {
  jobHandlers.set(name, handler);

  await safeQuery(
    `INSERT INTO dos.job_registry (job_id, job_code, schedule, status) VALUES ($1, $1, $2, 'active') ON CONFLICT (job_id) DO UPDATE SET schedule = EXCLUDED.schedule, status = 'active'`,
    [name, cronExpression],
  );

  if (handlerOnlyMode) return;

  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') {
    _loggerFn.debug(`[JobScheduler] Follower instance — skipping cron for ${name}`);
    return;
  }

  const existing = scheduledTasks.get(name);
  if (existing) clearInterval(existing);

  const interval = setInterval(async () => {
    const now = new Date();
    if (cronMatches(cronExpression, now)) {
      await executeJob(name, handler);
    }
  }, 60_000);
  interval.unref();

  scheduledTasks.set(name, interval);
}

export function createJobSchedulerImpl(): PlatformJobs {
  return {
    async registerJob(name: string, cronExpression: string, handler: () => Promise<void>): Promise<void> {
      staticJobDefinitions.push({ name, cron: cronExpression, handler });
      await registerJobImpl(name, cronExpression, handler);
    },

    async executeJobByName(jobName: string): Promise<void> {
      let handler = jobHandlers.get(jobName);
      if (!handler) {
        handlerOnlyMode = true;
        await registerAllJobDefinitions();
        handlerOnlyMode = false;
        handler = jobHandlers.get(jobName);
      }
      if (!handler) {
        throw new Error(`[JobScheduler] No handler registered for job: ${jobName}`);
      }
      await executeJob(jobName, handler);
    },

    async registerDefaultJobs(): Promise<void> {
      if (process.env.DISABLE_SCHEDULERS === 'true') {
        _loggerFn.info('[JobScheduler] All scheduled jobs disabled via DISABLE_SCHEDULERS=true');
        return;
      }

      const serverRole = process.env.SERVER_ROLE || 'web+jobs';
      if (serverRole === 'web') {
        _loggerFn.info('[JobScheduler] Schedulers skipped — SERVER_ROLE=web');
        return;
      }

      if (process.env.TEMPORAL_ENABLED === 'true') {
        _loggerFn.info('[JobScheduler] Temporal is primary scheduler — registering handlers only');
        handlerOnlyMode = true;
        await registerAllJobDefinitions();
        handlerOnlyMode = false;
        return;
      }

      await registerAllJobDefinitions();
    },

    isJobRunning(name: string): boolean {
      return runningJobs.has(name);
    },

    registerPostJobHook(fn: () => Promise<void>): void {
      postJobHooks.push(fn);
    },

    async getJobs(): Promise<JobInfo[]> {
      const result = await safeQuery(`SELECT * FROM dos.job_registry ORDER BY job_id`);
      return result.rows;
    },

    async getJobHistory(jobName: string, limit: number = 50): Promise<JobExecution[]> {
      const result = await safeQuery(
        `SELECT * FROM dos.job_executions WHERE job_id = $1 ORDER BY started_at DESC LIMIT $2`,
        [jobName, limit],
      );
      return result.rows;
    },
  };
}

export async function getProvisionedTenants(): Promise<Array<{ tenant_id: string; settings?: any }>> {
  const result = await safeQuery(
    `SELECT t.tenant_id, t.settings FROM dos.tenants t
     WHERE (t.status = 'active' OR t.status = 'onboarding')`,
  );
  return result.rows;
}
