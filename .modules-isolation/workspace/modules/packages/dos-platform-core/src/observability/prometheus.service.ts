import { Request, Response, NextFunction } from 'express';

let client: any = null;
let register: { metrics: () => Promise<string>; contentType: string; getSingleMetricAsString: (name: string) => Promise<string>; getMetricsAsJSON: () => Promise<Array<Record<string, unknown>>> } | null = null;

let httpDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;
let httpTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let dbDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;
let cacheHits: { inc: (labels: Record<string, string>) => void } | null = null;
let cacheMisses: { inc: (labels: Record<string, string>) => void } | null = null;
let activeConns: { inc: () => void; dec: () => void } | null = null;
let heapTrendGauge: { set: (value: number) => void } | null = null;
let errorTotal: { inc: (labels: Record<string, string>) => void } | null = null;

function init(): boolean {
  if (register) return true;
  try {
    client = require('prom-client');
    register = new client.Registry!();

    client.collectDefaultMetrics!({ register, prefix: 'dos_' });

    httpDuration = new client.Histogram!({
      name: 'dos_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register],
    });

    httpTotal = new client.Counter!({
      name: 'dos_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    dbDuration = new client.Histogram!({
      name: 'dos_db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register],
    });

    cacheHits = new client.Counter!({
      name: 'dos_cache_hits_total',
      help: 'Cache hit count',
      labelNames: ['namespace'],
      registers: [register],
    });

    cacheMisses = new client.Counter!({
      name: 'dos_cache_misses_total',
      help: 'Cache miss count',
      labelNames: ['namespace'],
      registers: [register],
    });

    activeConns = new client.Gauge!({
      name: 'dos_active_connections',
      help: 'Currently active HTTP connections',
      registers: [register],
    });

    heapTrendGauge = new client.Gauge!({
      name: 'dos_heap_trend_slope_bytes_per_minute',
      help: 'Linear regression slope of heap usage (bytes/min). Positive = potential leak.',
      registers: [register],
    });

    errorTotal = new client.Counter!({
      name: 'dos_errors_total',
      help: 'Total application errors by type and route',
      labelNames: ['type', 'route', 'status_code'],
      registers: [register],
    });

    return true;
  } catch {
    return false;
  }
}

function normalizeRoute(req: Request): string {
  if (req.route?.path) {
    return req.baseUrl + req.route.path;
  }
  return req.path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

export function metricsMiddleware() {
  const ready = init();
  return (req: Request, res: Response, next: NextFunction) => {
    if (!ready) return next();
    const start = process.hrtime.bigint();
    activeConns?.inc();

    res.on('finish', () => {
      activeConns?.dec();
      const durationNs = Number(process.hrtime.bigint() - start);
      const durationSec = durationNs / 1e9;
      const route = normalizeRoute(req);
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      httpDuration?.observe(labels, durationSec);
      httpTotal?.inc(labels);
    });

    next();
  };
}

export function recordDbQuery(operation: string, durationMs: number): void {
  if (!init()) return;
  dbDuration?.observe({ operation }, durationMs / 1000);
}

export function recordCacheHit(namespace: string = 'default'): void {
  if (!init()) return;
  cacheHits?.inc({ namespace });
}

export function recordCacheMiss(namespace: string = 'default'): void {
  if (!init()) return;
  cacheMisses?.inc({ namespace });
}

export type ErrorType = 'validation' | 'auth' | 'not_found' | 'internal' | 'external_service' | 'timeout';

export function classifyError(err: any): ErrorType {
  const status = err?.status || err?.statusCode;
  if (status === 400 || err?.code === 'VALIDATION_ERROR') return 'validation';
  if (status === 401 || status === 403 || err?.code === 'UNAUTHORIZED') return 'auth';
  if (status === 404) return 'not_found';
  if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND' || err?.name === 'CircuitBreakerOpenError') return 'external_service';
  if (err?.code === 'ABORT_ERR' || err?.name === 'AbortError' || err?.code === 'ETIMEDOUT') return 'timeout';
  return 'internal';
}

export function recordError(type: ErrorType, route: string, statusCode: number): void {
  if (!init()) return;
  errorTotal?.inc({ type, route, status_code: String(statusCode) });
}

export function setHeapTrendSlope(bytesPerMinute: number): void {
  if (!init()) return;
  heapTrendGauge?.set(bytesPerMinute);
}

export async function getMetricsText(): Promise<string> {
  if (!init()) return '# prom-client not installed\n';
  return register!.metrics();
}

export function getContentType(): string {
  if (!init()) return 'text/plain';
  return register!.contentType;
}

/**
 * Expose the shared Prometheus registry so per-service observability modules
 * can register custom counters/histograms that show up on the same /metrics.
 * Returns null if prom-client isn't installed.
 */
export function getPrometheusRegistry(): unknown | null {
  if (!init()) return null;
  return register;
}

/**
 * Access the underlying prom-client module so callers can construct their own
 * Counter/Gauge/Histogram without re-requiring prom-client. Stable only as
 * long as prom-client is the metrics backend.
 */
export function getPrometheusClient(): any | null {
  if (!init()) return null;
  return client;
}

const HEAP_SAMPLES: Array<{ time: number; bytes: number }> = [];
const HEAP_SAMPLE_INTERVAL_MS = 30_000;
const HEAP_MAX_SAMPLES = 60;
let _heapTimer: ReturnType<typeof setInterval> | null = null;

export function startHeapTrendTracker(): void {
  if (_heapTimer) return;
  _heapTimer = setInterval(() => {
    const bytes = process.memoryUsage().heapUsed;
    HEAP_SAMPLES.push({ time: Date.now(), bytes });
    if (HEAP_SAMPLES.length > HEAP_MAX_SAMPLES) HEAP_SAMPLES.shift();
    if (HEAP_SAMPLES.length >= 5) {
      const slope = computeHeapSlope();
      setHeapTrendSlope(slope);
    }
  }, HEAP_SAMPLE_INTERVAL_MS);
  _heapTimer.unref();
}

function computeHeapSlope(): number {
  const n = HEAP_SAMPLES.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const t0 = HEAP_SAMPLES[0].time;
  for (const s of HEAP_SAMPLES) {
    const x = (s.time - t0) / 60_000;
    const y = s.bytes;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function getHeapTrendData(): { samples: number; slopeBytes: number; leakSuspected: boolean } {
  const slope = computeHeapSlope();
  return {
    samples: HEAP_SAMPLES.length,
    slopeBytes: Math.round(slope),
    leakSuspected: slope > 0 && HEAP_SAMPLES.length >= 10,
  };
}

let dbPoolGauge: { set: (labels: Record<string, string>, value: number) => void } | null = null;
let circuitBreakerGauge: { set: (labels: Record<string, string>, value: number) => void } | null = null;
let migrationCounter: { inc: (labels: Record<string, string>) => void } | null = null;

export function initExtendedMetrics(): void {
  if (!init()) return;
  try {
    dbPoolGauge = new client.Gauge!({
      name: 'dos_db_pool_connections',
      help: 'Database connection pool status',
      labelNames: ['state'],
      registers: [register],
    });

    circuitBreakerGauge = new client.Gauge!({
      name: 'dos_circuit_breaker_state',
      help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
      labelNames: ['target'],
      registers: [register],
    });

    migrationCounter = new client.Counter!({
      name: 'dos_migrations_applied_total',
      help: 'Number of migrations applied',
      labelNames: ['service', 'status'],
      registers: [register],
    });
  } catch { /* prom-client not available */ }
}

export function recordDbPoolMetrics(active: number, idle: number, waiting: number): void {
  if (!dbPoolGauge) return;
  dbPoolGauge.set({ state: 'active' }, active);
  dbPoolGauge.set({ state: 'idle' }, idle);
  dbPoolGauge.set({ state: 'waiting' }, waiting);
}

export function recordCircuitBreakerState(target: string, state: string): void {
  if (!circuitBreakerGauge) return;
  const val = state === 'OPEN' ? 2 : state === 'HALF_OPEN' ? 1 : 0;
  circuitBreakerGauge.set({ target }, val);
}

export function recordMigration(service: string, status: 'success' | 'failure'): void {
  if (!migrationCounter) return;
  migrationCounter.inc({ service, status });
}

// ── Tenant migration ledger health gauges (Phase-2B 2026-04-30) ────────
let tenantMigrationsFailedGauge: { set: (labels: Record<string, string>, value: number) => void; reset: () => void } | null = null;
let tenantMigrationsByStatusGauge: { set: (labels: Record<string, string>, value: number) => void; reset: () => void } | null = null;

export function initTenantMigrationLedgerMetrics(): void {
  if (!init() || tenantMigrationsFailedGauge) return;
  try {
    tenantMigrationsFailedGauge = new client.Gauge!({
      name: 'dos_tenant_migrations_failed',
      help: 'Current number of failed rows in dos.tenant_migrations, labeled by tenant_id. Should be 0.',
      labelNames: ['tenant_id'],
      registers: [register],
    });
    tenantMigrationsByStatusGauge = new client.Gauge!({
      name: 'dos_tenant_migrations_by_status',
      help: 'Total rows in dos.tenant_migrations by status. Canonical: applied, failed. Legacy/transitional: verified-by-backfill, superseded-misclassified. Rejected: verified-by-clone (Fix 5 / Phase 18 — runner no longer emits this).',
      labelNames: ['status'],
      registers: [register],
    });
  } catch { /* prom-client not available */ }
}

/**
 * Refresh the tenant-migrations gauges from a fresh DB read. Caller is
 * expected to provide already-aggregated counts (called from a periodic
 * job or from a /metrics handler that reads the ledger). Empty input
 * resets the gauges so a tenant going from N→0 failed is reflected.
 */
export function setTenantMigrationsFailed(perTenant: Record<string, number>): void {
  if (!tenantMigrationsFailedGauge) return;
  tenantMigrationsFailedGauge.reset();
  for (const [tenantId, n] of Object.entries(perTenant)) {
    tenantMigrationsFailedGauge.set({ tenant_id: tenantId }, n);
  }
}

export function setTenantMigrationsByStatus(byStatus: Record<string, number>): void {
  if (!tenantMigrationsByStatusGauge) return;
  tenantMigrationsByStatusGauge.reset();
  for (const [status, n] of Object.entries(byStatus)) {
    tenantMigrationsByStatusGauge.set({ status }, n);
  }
}

// ── AI Agent & Domain Metrics ──────────────────────────────────────────

let agentRunDuration: any = null;
let agentRunTotal: any = null;
let agentTokensTotal: any = null;
let agentDelegationTotal: any = null;
let agentErrorTotal: any = null;
let eventBusPublishTotal: any = null;
let eventBusPublishDuration: any = null;

export function initAgentMetrics(): void {
  if (!init()) return;
  agentRunDuration = new client.Histogram({
    name: 'dos_agent_run_duration_seconds',
    help: 'Duration of AI agent execution runs',
    labelNames: ['agent_id', 'tenant_id', 'stop_reason'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
    registers: [register],
  });
  agentRunTotal = new client.Counter({
    name: 'dos_agent_runs_total',
    help: 'Total number of AI agent execution runs',
    labelNames: ['agent_id', 'status'],
    registers: [register],
  });
  agentTokensTotal = new client.Counter({
    name: 'dos_agent_tokens_total',
    help: 'Total tokens consumed by AI agents',
    labelNames: ['agent_id', 'direction'],
    registers: [register],
  });
  agentDelegationTotal = new client.Counter({
    name: 'dos_agent_delegations_total',
    help: 'Total inter-agent delegations',
    labelNames: ['source_agent', 'target_agent', 'status'],
    registers: [register],
  });
  agentErrorTotal = new client.Counter({
    name: 'dos_agent_errors_total',
    help: 'Total AI agent errors',
    labelNames: ['agent_id', 'error_type'],
    registers: [register],
  });
  eventBusPublishTotal = new client.Counter({
    name: 'dos_event_bus_publish_total',
    help: 'Total events published to event bus',
    labelNames: ['event_type', 'status'],
    registers: [register],
  });
  eventBusPublishDuration = new client.Histogram({
    name: 'dos_event_bus_publish_duration_seconds',
    help: 'Event bus publish duration',
    labelNames: ['event_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
  });
}

export function recordAgentRun(agentId: string, durationMs: number, tenantId: string, stopReason: string, isError: boolean): void {
  agentRunDuration?.observe({ agent_id: agentId, tenant_id: tenantId, stop_reason: stopReason }, durationMs / 1000);
  agentRunTotal?.inc({ agent_id: agentId, status: isError ? 'error' : 'success' });
}

export function recordAgentTokens(agentId: string, inputTokens: number, outputTokens: number): void {
  agentTokensTotal?.inc({ agent_id: agentId, direction: 'input' }, inputTokens);
  agentTokensTotal?.inc({ agent_id: agentId, direction: 'output' }, outputTokens);
}

export function recordAgentDelegation(sourceAgent: string, targetAgent: string, status: string): void {
  agentDelegationTotal?.inc({ source_agent: sourceAgent, target_agent: targetAgent, status });
}

export function recordAgentError(agentId: string, errorType: string): void {
  agentErrorTotal?.inc({ agent_id: agentId, error_type: errorType });
}

export function recordEventBusPublish(eventType: string, durationMs: number, success: boolean): void {
  eventBusPublishTotal?.inc({ event_type: eventType, status: success ? 'success' : 'failure' });
  eventBusPublishDuration?.observe({ event_type: eventType }, durationMs / 1000);
}

// ── Rate Limit Metrics ────────────────────────────────────────────

let rateLimitRejectionsTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let rateLimitRequestsTotal: { inc: (labels: Record<string, string>) => void } | null = null;

function ensureRateLimitMetrics(): void {
  if (rateLimitRejectionsTotal) return;
  if (!init()) return;
  try {
    rateLimitRejectionsTotal = new client.Counter!({
      name: 'dos_rate_limit_rejections_total',
      help: 'Total rate-limited (429) rejections',
      labelNames: ['namespace', 'tier'],
      registers: [register],
    });
    rateLimitRequestsTotal = new client.Counter!({
      name: 'dos_rate_limit_requests_total',
      help: 'Total requests checked by rate limiter',
      labelNames: ['namespace', 'tier'],
      registers: [register],
    });
  } catch { /* prom-client not available */ }
}

export function recordRateLimitCheck(namespace: string, tier: string = 'default'): void {
  ensureRateLimitMetrics();
  rateLimitRequestsTotal?.inc({ namespace, tier });
}

export function recordRateLimitRejection(namespace: string, tier: string = 'default'): void {
  ensureRateLimitMetrics();
  rateLimitRejectionsTotal?.inc({ namespace, tier });
}

// ── Business Metrics ──────────────────────────────────────────────

let tenantsActiveGauge: any = null;
let risksCreatedTotal: any = null;
let assessmentsCompletedTotal: any = null;

export function initBusinessMetrics(): void {
  if (!init()) return;
  tenantsActiveGauge = new client.Gauge({
    name: 'dos_tenants_active',
    help: 'Number of currently active tenants',
    labelNames: ['tier'],
    registers: [register],
  });
  risksCreatedTotal = new client.Counter({
    name: 'dos_risks_created_total',
    help: 'Total risks created',
    labelNames: ['tenant_id', 'severity'],
    registers: [register],
  });
  assessmentsCompletedTotal = new client.Counter({
    name: 'dos_assessments_completed_total',
    help: 'Total assessments completed',
    labelNames: ['tenant_id', 'framework'],
    registers: [register],
  });
}

export function setTenantsActive(tier: string, count: number): void {
  tenantsActiveGauge?.set({ tier }, count);
}

export function recordRiskCreated(tenantId: string, severity: string): void {
  risksCreatedTotal?.inc({ tenant_id: tenantId, severity });
}

export function recordAssessmentCompleted(tenantId: string, framework: string): void {
  assessmentsCompletedTotal?.inc({ tenant_id: tenantId, framework });
}

// ── WebSocket Metrics ─────────────────────────────────────────────

let wsActiveConns: { set: (value: number) => void } | null = null;
let wsConnectTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let wsDisconnectTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let wsSendFailTotal: { inc: () => void } | null = null;
let wsSlowConsumersTotal: { inc: () => void } | null = null;
let wsInboundTotal: { inc: () => void } | null = null;
let wsRateLimitedTotal: { inc: () => void } | null = null;

export function initWsMetrics(): void {
  if (!init()) return;
  try {
    wsActiveConns = new client.Gauge!({
      name: 'dos_ws_active_connections',
      help: 'Currently active WebSocket connections',
      registers: [register],
    });
    wsConnectTotal = new client.Counter!({
      name: 'dos_ws_connections_total',
      help: 'Total WebSocket connection attempts',
      labelNames: ['status'],
      registers: [register],
    });
    wsDisconnectTotal = new client.Counter!({
      name: 'dos_ws_disconnections_total',
      help: 'Total WebSocket disconnections by reason',
      labelNames: ['reason'],
      registers: [register],
    });
    wsSendFailTotal = new client.Counter!({
      name: 'dos_ws_send_failures_total',
      help: 'Total WebSocket message send failures',
      registers: [register],
    });
    wsSlowConsumersTotal = new client.Counter!({
      name: 'dos_ws_slow_consumers_closed_total',
      help: 'Total slow consumer connections closed',
      registers: [register],
    });
    wsInboundTotal = new client.Counter!({
      name: 'dos_ws_inbound_messages_total',
      help: 'Total inbound WebSocket messages',
      registers: [register],
    });
    wsRateLimitedTotal = new client.Counter!({
      name: 'dos_ws_rate_limited_total',
      help: 'Total inbound messages rejected by rate limiter',
      registers: [register],
    });
  } catch { /* prom-client not available */ }
}

export function recordWsConnect(success: boolean): void {
  wsConnectTotal?.inc({ status: success ? 'success' : 'failure' });
}

export function setWsActiveConnections(count: number): void {
  wsActiveConns?.set(count);
}

export function recordWsDisconnect(reason: string): void {
  wsDisconnectTotal?.inc({ reason });
}

export function recordWsSendFailure(): void {
  wsSendFailTotal?.inc();
}

export function recordWsSlowConsumer(): void {
  wsSlowConsumersTotal?.inc();
}

export function recordWsInbound(): void {
  wsInboundTotal?.inc();
}

export function recordWsRateLimited(): void {
  wsRateLimitedTotal?.inc();
}

// ── Outbox + registration metrics (new-user journey Phase 5/7/13) ─────────

let outboxPublishedTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let outboxFailuresTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let outboxDeadTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let outboxPendingGauge: { set: (labels: Record<string, string>, value: number) => void } | null = null;
let outboxLagSecondsGauge: { set: (labels: Record<string, string>, value: number) => void } | null = null;
let outboxPublishDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;

let registrationRequestsTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let registrationDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;

let onboardingSessionsTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let onboardingStagesTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let onboardingStageDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;
let onboardingProvisioningJobsTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let onboardingProvisioningJobDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;
let onboardingProvisioningStepDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;
let onboardingFunnelSessionsGauge: { set: (labels: Record<string, string>, value: number) => void } | null = null;
let onboardingProvisioningJobsGauge: { set: (labels: Record<string, string>, value: number) => void } | null = null;
let onboardingStageParkedOpenGauge: { set: (labels: Record<string, string>, value: number) => void } | null = null;
let onboardingUiEventsTotal: { inc: (labels: Record<string, string>) => void } | null = null;

function ensureOutboxMetrics(): void {
  if (outboxPublishedTotal) return;
  if (!init()) return;
  try {
    outboxPublishedTotal = new client.Counter!({
      name: 'dos_outbox_published_total',
      help: 'Outbox rows successfully published to the event bus',
      labelNames: ['event_type'],
      registers: [register],
    });
    outboxFailuresTotal = new client.Counter!({
      name: 'dos_outbox_publish_failures_total',
      help: 'Outbox publish failures by event type',
      labelNames: ['event_type'],
      registers: [register],
    });
    outboxDeadTotal = new client.Counter!({
      name: 'dos_outbox_dead_total',
      help: 'Outbox rows transitioned to dead-letter state',
      labelNames: ['event_type'],
      registers: [register],
    });
    outboxPendingGauge = new client.Gauge!({
      name: 'dos_outbox_pending',
      help: 'Current pending outbox rows (sampled by publisher)',
      labelNames: ['status'],
      registers: [register],
    });
    outboxLagSecondsGauge = new client.Gauge!({
      name: 'dos_outbox_lag_seconds',
      help: 'Oldest pending-row age in seconds (since created_at)',
      labelNames: ['tenant_scope'],
      registers: [register],
    });
    outboxPublishDuration = new client.Histogram!({
      name: 'dos_outbox_publish_duration_seconds',
      help: 'Outbox publish latency per row',
      labelNames: ['event_type'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [register],
    });
  } catch { /* prom-client missing */ }
}

function ensureRegistrationMetrics(): void {
  if (registrationRequestsTotal) return;
  if (!init()) return;
  try {
    registrationRequestsTotal = new client.Counter!({
      name: 'dos_registration_requests_total',
      help: 'Total /register attempts',
      labelNames: ['result'],
      registers: [register],
    });
    registrationDuration = new client.Histogram!({
      name: 'dos_registration_duration_seconds',
      help: '/register end-to-end latency',
      labelNames: ['result'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [register],
    });
  } catch { /* prom-client missing */ }
}

function ensureOnboardingJourneyMetrics(): void {
  if (onboardingSessionsTotal) return;
  if (!init()) return;
  try {
    onboardingSessionsTotal = new client.Counter!({
      name: 'dos_onboarding_sessions_total',
      help: 'Onboarding session lifecycle events',
      labelNames: ['event', 'region', 'product'],
      registers: [register],
    });
    onboardingStagesTotal = new client.Counter!({
      name: 'dos_onboarding_stages_total',
      help: 'Onboarding stage lifecycle events',
      labelNames: ['event', 'stage', 'region', 'product'],
      registers: [register],
    });
    onboardingStageDuration = new client.Histogram!({
      name: 'dos_onboarding_stage_duration_seconds',
      help: 'Time spent on each onboarding stage (completed stages only)',
      labelNames: ['stage', 'region', 'product'],
      buckets: [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 14400, 28800],
      registers: [register],
    });
    onboardingProvisioningJobsTotal = new client.Counter!({
      name: 'dos_onboarding_provisioning_jobs_total',
      help: 'Provisioning job lifecycle events',
      labelNames: ['result', 'region', 'product'],
      registers: [register],
    });
    onboardingProvisioningJobDuration = new client.Histogram!({
      name: 'dos_onboarding_provisioning_job_duration_seconds',
      help: 'Provisioning job duration (completed/failed)',
      labelNames: ['result', 'region', 'product'],
      buckets: [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 14400],
      registers: [register],
    });
    onboardingProvisioningStepDuration = new client.Histogram!({
      name: 'dos_onboarding_provisioning_step_duration_seconds',
      help: 'Provisioning step duration (completed/failed)',
      labelNames: ['step', 'result', 'region', 'product'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 1200],
      registers: [register],
    });
    onboardingFunnelSessionsGauge = new client.Gauge!({
      name: 'dos_onboarding_funnel_sessions',
      help: 'Onboarding sessions by status (sampled)',
      labelNames: ['status', 'region', 'product'],
      registers: [register],
    });
    onboardingProvisioningJobsGauge = new client.Gauge!({
      name: 'dos_onboarding_provisioning_jobs',
      help: 'Provisioning jobs by job_status (sampled)',
      labelNames: ['job_status', 'region', 'product'],
      registers: [register],
    });
    onboardingStageParkedOpenGauge = new client.Gauge!({
      name: 'dos_onboarding_stage_parked_open',
      help: 'Sessions parked on a stage that are still in open statuses (sampled)',
      labelNames: ['stage', 'region', 'product'],
      registers: [register],
    });
    onboardingUiEventsTotal = new client.Counter!({
      name: 'dos_onboarding_ui_event_total',
      help: 'Onboarding UI event ingestion counter (frontend-emitted events)',
      labelNames: ['event', 'region', 'product'],
      registers: [register],
    });
  } catch { /* prom-client missing */ }
}

export function recordOutboxPublished(eventType: string, durationMs: number): void {
  ensureOutboxMetrics();
  outboxPublishedTotal?.inc({ event_type: eventType });
  outboxPublishDuration?.observe({ event_type: eventType }, durationMs / 1000);
}

export function recordOutboxFailure(eventType: string): void {
  ensureOutboxMetrics();
  outboxFailuresTotal?.inc({ event_type: eventType });
}

export function recordOutboxDead(eventType: string): void {
  ensureOutboxMetrics();
  outboxDeadTotal?.inc({ event_type: eventType });
}

export function setOutboxPending(status: string, count: number): void {
  ensureOutboxMetrics();
  outboxPendingGauge?.set({ status }, count);
}

export function setOutboxLagSeconds(tenantScope: string, seconds: number): void {
  ensureOutboxMetrics();
  outboxLagSecondsGauge?.set({ tenant_scope: tenantScope }, seconds);
}

export function recordRegistrationAttempt(result: string, durationMs: number): void {
  ensureRegistrationMetrics();
  registrationRequestsTotal?.inc({ result });
  registrationDuration?.observe({ result }, durationMs / 1000);
}

export function recordOnboardingSessionEvent(event: string, region: string, product: string): void {
  ensureOnboardingJourneyMetrics();
  onboardingSessionsTotal?.inc({ event, region, product });
}

export function recordOnboardingStageEvent(event: string, stage: string, region: string, product: string): void {
  ensureOnboardingJourneyMetrics();
  onboardingStagesTotal?.inc({ event, stage, region, product });
}

export function recordOnboardingStageDuration(stage: string, region: string, product: string, durationMs: number): void {
  ensureOnboardingJourneyMetrics();
  onboardingStageDuration?.observe({ stage, region, product }, durationMs / 1000);
}

export function recordOnboardingProvisioningJob(result: string, region: string, product: string, durationMs?: number): void {
  ensureOnboardingJourneyMetrics();
  onboardingProvisioningJobsTotal?.inc({ result, region, product });
  if (durationMs != null) {
    onboardingProvisioningJobDuration?.observe({ result, region, product }, durationMs / 1000);
  }
}

export function recordOnboardingProvisioningStep(step: string, result: string, region: string, product: string, durationMs?: number): void {
  ensureOnboardingJourneyMetrics();
  if (durationMs != null) {
    onboardingProvisioningStepDuration?.observe({ step, result, region, product }, durationMs / 1000);
  }
}

export function setOnboardingFunnelSessions(status: string, region: string, product: string, count: number): void {
  ensureOnboardingJourneyMetrics();
  onboardingFunnelSessionsGauge?.set({ status, region, product }, count);
}

export function setOnboardingProvisioningJobs(jobStatus: string, region: string, product: string, count: number): void {
  ensureOnboardingJourneyMetrics();
  onboardingProvisioningJobsGauge?.set({ job_status: jobStatus, region, product }, count);
}

export function setOnboardingStageParkedOpen(stage: string, region: string, product: string, count: number): void {
  ensureOnboardingJourneyMetrics();
  onboardingStageParkedOpenGauge?.set({ stage, region, product }, count);
}

export function recordOnboardingUiEvent(event: string, region: string, product: string): void {
  ensureOnboardingJourneyMetrics();
  onboardingUiEventsTotal?.inc({ event, region, product });
}

// ── ClickHouse consumer metrics ──────────────────────────────────────────

let chInsertRowsTotal: { inc: (labels: Record<string, string>, value?: number) => void } | null = null;
let chFlushTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let chFlushFailuresTotal: { inc: (labels: Record<string, string>) => void } | null = null;
let chFlushDuration: { observe: (labels: Record<string, string>, value: number) => void } | null = null;
let chBufferDepthGauge: { set: (labels: Record<string, string>, value: number) => void } | null = null;
let chHealthGauge: { set: (value: number) => void } | null = null;

function ensureClickHouseMetrics(): void {
  if (chInsertRowsTotal) return;
  if (!init()) return;
  try {
    chInsertRowsTotal = new client.Counter!({
      name: 'dos_clickhouse_inserted_rows_total',
      help: 'Rows successfully inserted into ClickHouse by table',
      labelNames: ['table'],
      registers: [register],
    });
    chFlushTotal = new client.Counter!({
      name: 'dos_clickhouse_flushes_total',
      help: 'ClickHouse buffer flushes by table and result',
      labelNames: ['table', 'result'],
      registers: [register],
    });
    chFlushFailuresTotal = new client.Counter!({
      name: 'dos_clickhouse_flush_failures_total',
      help: 'ClickHouse flush failures by table',
      labelNames: ['table'],
      registers: [register],
    });
    chFlushDuration = new client.Histogram!({
      name: 'dos_clickhouse_flush_duration_seconds',
      help: 'Latency of ClickHouse buffer flushes',
      labelNames: ['table'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register],
    });
    chBufferDepthGauge = new client.Gauge!({
      name: 'dos_clickhouse_buffer_depth',
      help: 'Current in-memory ClickHouse buffer depth per table',
      labelNames: ['table'],
      registers: [register],
    });
    chHealthGauge = new client.Gauge!({
      name: 'dos_clickhouse_up',
      help: 'ClickHouse reachability: 1 = healthy, 0 = unhealthy',
      registers: [register],
    });
  } catch { /* prom-client missing */ }
}

export function recordClickHouseInsert(table: string, rows: number): void {
  ensureClickHouseMetrics();
  chInsertRowsTotal?.inc({ table }, rows);
}

export function recordClickHouseFlush(table: string, durationMs: number, success: boolean): void {
  ensureClickHouseMetrics();
  chFlushTotal?.inc({ table, result: success ? 'success' : 'failure' });
  chFlushDuration?.observe({ table }, durationMs / 1000);
  if (!success) chFlushFailuresTotal?.inc({ table });
}

export function setClickHouseBufferDepth(table: string, depth: number): void {
  ensureClickHouseMetrics();
  chBufferDepthGauge?.set({ table }, depth);
}

export function setClickHouseHealth(healthy: boolean): void {
  ensureClickHouseMetrics();
  chHealthGauge?.set(healthy ? 1 : 0);
}

export async function getResponseTimeSLAs(): Promise<Record<string, unknown>> {
  if (!init()) return { error: 'prom-client not installed' };

  const allMetrics = await register!.getMetricsAsJSON();
  const httpHist = allMetrics.find((m: Record<string, any>) => m.name === 'dos_http_request_duration_seconds');
  if (!httpHist || !httpHist.values) {
    return { p50: 0, p95: 0, p99: 0, byRoute: [] };
  }

  const routeMap = new Map<string, { sum: number; count: number }>();
  for (const v of (httpHist.values as any[])) {
    if (v.metricName?.endsWith('_sum') && v.labels?.route) {
      const key = `${v.labels.method} ${v.labels.route}`;
      const existing = routeMap.get(key) || { sum: 0, count: 0 };
      existing.sum += v.value;
      routeMap.set(key, existing);
    }
    if (v.metricName?.endsWith('_count') && v.labels?.route) {
      const key = `${v.labels.method} ${v.labels.route}`;
      const existing = routeMap.get(key) || { sum: 0, count: 0 };
      existing.count += v.value;
      routeMap.set(key, existing);
    }
  }

  const byRoute = [...routeMap.entries()].map(([route, data]) => ({
    route,
    avgMs: data.count > 0 ? Math.round((data.sum / data.count) * 1000) : 0,
    requests: data.count,
    alert: data.count > 0 && (data.sum / data.count) * 1000 > 500,
  })).sort((a, b) => b.avgMs - a.avgMs);

  let totalSum = 0;
  let totalCount = 0;
  for (const d of routeMap.values()) {
    totalSum += d.sum;
    totalCount += d.count;
  }
  const globalAvgMs = totalCount > 0 ? Math.round((totalSum / totalCount) * 1000) : 0;

  return {
    globalAvgMs,
    totalRequests: totalCount,
    byRoute: byRoute.slice(0, 50),
    slowRoutes: byRoute.filter((r) => r.alert),
  };
}
