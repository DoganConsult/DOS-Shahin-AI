"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = metricsMiddleware;
exports.recordDbQuery = recordDbQuery;
exports.recordCacheHit = recordCacheHit;
exports.recordCacheMiss = recordCacheMiss;
exports.classifyError = classifyError;
exports.recordError = recordError;
exports.setHeapTrendSlope = setHeapTrendSlope;
exports.getMetricsText = getMetricsText;
exports.getContentType = getContentType;
exports.getPrometheusRegistry = getPrometheusRegistry;
exports.getPrometheusClient = getPrometheusClient;
exports.startHeapTrendTracker = startHeapTrendTracker;
exports.getHeapTrendData = getHeapTrendData;
exports.initExtendedMetrics = initExtendedMetrics;
exports.recordDbPoolMetrics = recordDbPoolMetrics;
exports.recordCircuitBreakerState = recordCircuitBreakerState;
exports.recordMigration = recordMigration;
exports.initAgentMetrics = initAgentMetrics;
exports.recordAgentRun = recordAgentRun;
exports.recordAgentTokens = recordAgentTokens;
exports.recordAgentDelegation = recordAgentDelegation;
exports.recordAgentError = recordAgentError;
exports.recordEventBusPublish = recordEventBusPublish;
exports.recordRateLimitCheck = recordRateLimitCheck;
exports.recordRateLimitRejection = recordRateLimitRejection;
exports.initBusinessMetrics = initBusinessMetrics;
exports.setTenantsActive = setTenantsActive;
exports.recordRiskCreated = recordRiskCreated;
exports.recordAssessmentCompleted = recordAssessmentCompleted;
exports.initWsMetrics = initWsMetrics;
exports.recordWsConnect = recordWsConnect;
exports.setWsActiveConnections = setWsActiveConnections;
exports.recordWsDisconnect = recordWsDisconnect;
exports.recordWsSendFailure = recordWsSendFailure;
exports.recordWsSlowConsumer = recordWsSlowConsumer;
exports.recordWsInbound = recordWsInbound;
exports.recordWsRateLimited = recordWsRateLimited;
exports.recordOutboxPublished = recordOutboxPublished;
exports.recordOutboxFailure = recordOutboxFailure;
exports.recordOutboxDead = recordOutboxDead;
exports.setOutboxPending = setOutboxPending;
exports.setOutboxLagSeconds = setOutboxLagSeconds;
exports.recordRegistrationAttempt = recordRegistrationAttempt;
exports.recordOnboardingSessionEvent = recordOnboardingSessionEvent;
exports.recordOnboardingStageEvent = recordOnboardingStageEvent;
exports.recordOnboardingStageDuration = recordOnboardingStageDuration;
exports.recordOnboardingProvisioningJob = recordOnboardingProvisioningJob;
exports.recordOnboardingProvisioningStep = recordOnboardingProvisioningStep;
exports.setOnboardingFunnelSessions = setOnboardingFunnelSessions;
exports.setOnboardingProvisioningJobs = setOnboardingProvisioningJobs;
exports.setOnboardingStageParkedOpen = setOnboardingStageParkedOpen;
exports.recordOnboardingUiEvent = recordOnboardingUiEvent;
exports.recordClickHouseInsert = recordClickHouseInsert;
exports.recordClickHouseFlush = recordClickHouseFlush;
exports.setClickHouseBufferDepth = setClickHouseBufferDepth;
exports.setClickHouseHealth = setClickHouseHealth;
exports.getResponseTimeSLAs = getResponseTimeSLAs;
let client = null;
let register = null;
let httpDuration = null;
let httpTotal = null;
let dbDuration = null;
let cacheHits = null;
let cacheMisses = null;
let activeConns = null;
let heapTrendGauge = null;
let errorTotal = null;
function init() {
    if (register)
        return true;
    try {
        client = require('prom-client');
        register = new client.Registry();
        client.collectDefaultMetrics({ register, prefix: 'dos_' });
        httpDuration = new client.Histogram({
            name: 'dos_http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [register],
        });
        httpTotal = new client.Counter({
            name: 'dos_http_requests_total',
            help: 'Total HTTP requests',
            labelNames: ['method', 'route', 'status_code'],
            registers: [register],
        });
        dbDuration = new client.Histogram({
            name: 'dos_db_query_duration_seconds',
            help: 'Database query duration in seconds',
            labelNames: ['operation'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
            registers: [register],
        });
        cacheHits = new client.Counter({
            name: 'dos_cache_hits_total',
            help: 'Cache hit count',
            labelNames: ['namespace'],
            registers: [register],
        });
        cacheMisses = new client.Counter({
            name: 'dos_cache_misses_total',
            help: 'Cache miss count',
            labelNames: ['namespace'],
            registers: [register],
        });
        activeConns = new client.Gauge({
            name: 'dos_active_connections',
            help: 'Currently active HTTP connections',
            registers: [register],
        });
        heapTrendGauge = new client.Gauge({
            name: 'dos_heap_trend_slope_bytes_per_minute',
            help: 'Linear regression slope of heap usage (bytes/min). Positive = potential leak.',
            registers: [register],
        });
        errorTotal = new client.Counter({
            name: 'dos_errors_total',
            help: 'Total application errors by type and route',
            labelNames: ['type', 'route', 'status_code'],
            registers: [register],
        });
        return true;
    }
    catch {
        return false;
    }
}
function normalizeRoute(req) {
    if (req.route?.path) {
        return req.baseUrl + req.route.path;
    }
    return req.path
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
        .replace(/\/\d+/g, '/:id');
}
function metricsMiddleware() {
    const ready = init();
    return (req, res, next) => {
        if (!ready)
            return next();
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
function recordDbQuery(operation, durationMs) {
    if (!init())
        return;
    dbDuration?.observe({ operation }, durationMs / 1000);
}
function recordCacheHit(namespace = 'default') {
    if (!init())
        return;
    cacheHits?.inc({ namespace });
}
function recordCacheMiss(namespace = 'default') {
    if (!init())
        return;
    cacheMisses?.inc({ namespace });
}
function classifyError(err) {
    const status = err?.status || err?.statusCode;
    if (status === 400 || err?.code === 'VALIDATION_ERROR')
        return 'validation';
    if (status === 401 || status === 403 || err?.code === 'UNAUTHORIZED')
        return 'auth';
    if (status === 404)
        return 'not_found';
    if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND' || err?.name === 'CircuitBreakerOpenError')
        return 'external_service';
    if (err?.code === 'ABORT_ERR' || err?.name === 'AbortError' || err?.code === 'ETIMEDOUT')
        return 'timeout';
    return 'internal';
}
function recordError(type, route, statusCode) {
    if (!init())
        return;
    errorTotal?.inc({ type, route, status_code: String(statusCode) });
}
function setHeapTrendSlope(bytesPerMinute) {
    if (!init())
        return;
    heapTrendGauge?.set(bytesPerMinute);
}
async function getMetricsText() {
    if (!init())
        return '# prom-client not installed\n';
    return register.metrics();
}
function getContentType() {
    if (!init())
        return 'text/plain';
    return register.contentType;
}
/**
 * Expose the shared Prometheus registry so per-service observability modules
 * can register custom counters/histograms that show up on the same /metrics.
 * Returns null if prom-client isn't installed.
 */
function getPrometheusRegistry() {
    if (!init())
        return null;
    return register;
}
/**
 * Access the underlying prom-client module so callers can construct their own
 * Counter/Gauge/Histogram without re-requiring prom-client. Stable only as
 * long as prom-client is the metrics backend.
 */
function getPrometheusClient() {
    if (!init())
        return null;
    return client;
}
const HEAP_SAMPLES = [];
const HEAP_SAMPLE_INTERVAL_MS = 30_000;
const HEAP_MAX_SAMPLES = 60;
let _heapTimer = null;
function startHeapTrendTracker() {
    if (_heapTimer)
        return;
    _heapTimer = setInterval(() => {
        const bytes = process.memoryUsage().heapUsed;
        HEAP_SAMPLES.push({ time: Date.now(), bytes });
        if (HEAP_SAMPLES.length > HEAP_MAX_SAMPLES)
            HEAP_SAMPLES.shift();
        if (HEAP_SAMPLES.length >= 5) {
            const slope = computeHeapSlope();
            setHeapTrendSlope(slope);
        }
    }, HEAP_SAMPLE_INTERVAL_MS);
    _heapTimer.unref();
}
function computeHeapSlope() {
    const n = HEAP_SAMPLES.length;
    if (n < 2)
        return 0;
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
    if (denom === 0)
        return 0;
    return (n * sumXY - sumX * sumY) / denom;
}
function getHeapTrendData() {
    const slope = computeHeapSlope();
    return {
        samples: HEAP_SAMPLES.length,
        slopeBytes: Math.round(slope),
        leakSuspected: slope > 0 && HEAP_SAMPLES.length >= 10,
    };
}
let dbPoolGauge = null;
let circuitBreakerGauge = null;
let migrationCounter = null;
function initExtendedMetrics() {
    if (!init())
        return;
    try {
        dbPoolGauge = new client.Gauge({
            name: 'dos_db_pool_connections',
            help: 'Database connection pool status',
            labelNames: ['state'],
            registers: [register],
        });
        circuitBreakerGauge = new client.Gauge({
            name: 'dos_circuit_breaker_state',
            help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
            labelNames: ['target'],
            registers: [register],
        });
        migrationCounter = new client.Counter({
            name: 'dos_migrations_applied_total',
            help: 'Number of migrations applied',
            labelNames: ['service', 'status'],
            registers: [register],
        });
    }
    catch { /* prom-client not available */ }
}
function recordDbPoolMetrics(active, idle, waiting) {
    if (!dbPoolGauge)
        return;
    dbPoolGauge.set({ state: 'active' }, active);
    dbPoolGauge.set({ state: 'idle' }, idle);
    dbPoolGauge.set({ state: 'waiting' }, waiting);
}
function recordCircuitBreakerState(target, state) {
    if (!circuitBreakerGauge)
        return;
    const val = state === 'OPEN' ? 2 : state === 'HALF_OPEN' ? 1 : 0;
    circuitBreakerGauge.set({ target }, val);
}
function recordMigration(service, status) {
    if (!migrationCounter)
        return;
    migrationCounter.inc({ service, status });
}
// ── AI Agent & Domain Metrics ──────────────────────────────────────────
let agentRunDuration = null;
let agentRunTotal = null;
let agentTokensTotal = null;
let agentDelegationTotal = null;
let agentErrorTotal = null;
let eventBusPublishTotal = null;
let eventBusPublishDuration = null;
function initAgentMetrics() {
    if (!init())
        return;
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
function recordAgentRun(agentId, durationMs, tenantId, stopReason, isError) {
    agentRunDuration?.observe({ agent_id: agentId, tenant_id: tenantId, stop_reason: stopReason }, durationMs / 1000);
    agentRunTotal?.inc({ agent_id: agentId, status: isError ? 'error' : 'success' });
}
function recordAgentTokens(agentId, inputTokens, outputTokens) {
    agentTokensTotal?.inc({ agent_id: agentId, direction: 'input' }, inputTokens);
    agentTokensTotal?.inc({ agent_id: agentId, direction: 'output' }, outputTokens);
}
function recordAgentDelegation(sourceAgent, targetAgent, status) {
    agentDelegationTotal?.inc({ source_agent: sourceAgent, target_agent: targetAgent, status });
}
function recordAgentError(agentId, errorType) {
    agentErrorTotal?.inc({ agent_id: agentId, error_type: errorType });
}
function recordEventBusPublish(eventType, durationMs, success) {
    eventBusPublishTotal?.inc({ event_type: eventType, status: success ? 'success' : 'failure' });
    eventBusPublishDuration?.observe({ event_type: eventType }, durationMs / 1000);
}
// ── Rate Limit Metrics ────────────────────────────────────────────
let rateLimitRejectionsTotal = null;
let rateLimitRequestsTotal = null;
function ensureRateLimitMetrics() {
    if (rateLimitRejectionsTotal)
        return;
    if (!init())
        return;
    try {
        rateLimitRejectionsTotal = new client.Counter({
            name: 'dos_rate_limit_rejections_total',
            help: 'Total rate-limited (429) rejections',
            labelNames: ['namespace', 'tier'],
            registers: [register],
        });
        rateLimitRequestsTotal = new client.Counter({
            name: 'dos_rate_limit_requests_total',
            help: 'Total requests checked by rate limiter',
            labelNames: ['namespace', 'tier'],
            registers: [register],
        });
    }
    catch { /* prom-client not available */ }
}
function recordRateLimitCheck(namespace, tier = 'default') {
    ensureRateLimitMetrics();
    rateLimitRequestsTotal?.inc({ namespace, tier });
}
function recordRateLimitRejection(namespace, tier = 'default') {
    ensureRateLimitMetrics();
    rateLimitRejectionsTotal?.inc({ namespace, tier });
}
// ── Business Metrics ──────────────────────────────────────────────
let tenantsActiveGauge = null;
let risksCreatedTotal = null;
let assessmentsCompletedTotal = null;
function initBusinessMetrics() {
    if (!init())
        return;
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
function setTenantsActive(tier, count) {
    tenantsActiveGauge?.set({ tier }, count);
}
function recordRiskCreated(tenantId, severity) {
    risksCreatedTotal?.inc({ tenant_id: tenantId, severity });
}
function recordAssessmentCompleted(tenantId, framework) {
    assessmentsCompletedTotal?.inc({ tenant_id: tenantId, framework });
}
// ── WebSocket Metrics ─────────────────────────────────────────────
let wsActiveConns = null;
let wsConnectTotal = null;
let wsDisconnectTotal = null;
let wsSendFailTotal = null;
let wsSlowConsumersTotal = null;
let wsInboundTotal = null;
let wsRateLimitedTotal = null;
function initWsMetrics() {
    if (!init())
        return;
    try {
        wsActiveConns = new client.Gauge({
            name: 'dos_ws_active_connections',
            help: 'Currently active WebSocket connections',
            registers: [register],
        });
        wsConnectTotal = new client.Counter({
            name: 'dos_ws_connections_total',
            help: 'Total WebSocket connection attempts',
            labelNames: ['status'],
            registers: [register],
        });
        wsDisconnectTotal = new client.Counter({
            name: 'dos_ws_disconnections_total',
            help: 'Total WebSocket disconnections by reason',
            labelNames: ['reason'],
            registers: [register],
        });
        wsSendFailTotal = new client.Counter({
            name: 'dos_ws_send_failures_total',
            help: 'Total WebSocket message send failures',
            registers: [register],
        });
        wsSlowConsumersTotal = new client.Counter({
            name: 'dos_ws_slow_consumers_closed_total',
            help: 'Total slow consumer connections closed',
            registers: [register],
        });
        wsInboundTotal = new client.Counter({
            name: 'dos_ws_inbound_messages_total',
            help: 'Total inbound WebSocket messages',
            registers: [register],
        });
        wsRateLimitedTotal = new client.Counter({
            name: 'dos_ws_rate_limited_total',
            help: 'Total inbound messages rejected by rate limiter',
            registers: [register],
        });
    }
    catch { /* prom-client not available */ }
}
function recordWsConnect(success) {
    wsConnectTotal?.inc({ status: success ? 'success' : 'failure' });
}
function setWsActiveConnections(count) {
    wsActiveConns?.set(count);
}
function recordWsDisconnect(reason) {
    wsDisconnectTotal?.inc({ reason });
}
function recordWsSendFailure() {
    wsSendFailTotal?.inc();
}
function recordWsSlowConsumer() {
    wsSlowConsumersTotal?.inc();
}
function recordWsInbound() {
    wsInboundTotal?.inc();
}
function recordWsRateLimited() {
    wsRateLimitedTotal?.inc();
}
// ── Outbox + registration metrics (new-user journey Phase 5/7/13) ─────────
let outboxPublishedTotal = null;
let outboxFailuresTotal = null;
let outboxDeadTotal = null;
let outboxPendingGauge = null;
let outboxLagSecondsGauge = null;
let outboxPublishDuration = null;
let registrationRequestsTotal = null;
let registrationDuration = null;
let onboardingSessionsTotal = null;
let onboardingStagesTotal = null;
let onboardingStageDuration = null;
let onboardingProvisioningJobsTotal = null;
let onboardingProvisioningJobDuration = null;
let onboardingProvisioningStepDuration = null;
let onboardingFunnelSessionsGauge = null;
let onboardingProvisioningJobsGauge = null;
let onboardingStageParkedOpenGauge = null;
let onboardingUiEventsTotal = null;
function ensureOutboxMetrics() {
    if (outboxPublishedTotal)
        return;
    if (!init())
        return;
    try {
        outboxPublishedTotal = new client.Counter({
            name: 'dos_outbox_published_total',
            help: 'Outbox rows successfully published to the event bus',
            labelNames: ['event_type'],
            registers: [register],
        });
        outboxFailuresTotal = new client.Counter({
            name: 'dos_outbox_publish_failures_total',
            help: 'Outbox publish failures by event type',
            labelNames: ['event_type'],
            registers: [register],
        });
        outboxDeadTotal = new client.Counter({
            name: 'dos_outbox_dead_total',
            help: 'Outbox rows transitioned to dead-letter state',
            labelNames: ['event_type'],
            registers: [register],
        });
        outboxPendingGauge = new client.Gauge({
            name: 'dos_outbox_pending',
            help: 'Current pending outbox rows (sampled by publisher)',
            labelNames: ['status'],
            registers: [register],
        });
        outboxLagSecondsGauge = new client.Gauge({
            name: 'dos_outbox_lag_seconds',
            help: 'Oldest pending-row age in seconds (since created_at)',
            labelNames: ['tenant_scope'],
            registers: [register],
        });
        outboxPublishDuration = new client.Histogram({
            name: 'dos_outbox_publish_duration_seconds',
            help: 'Outbox publish latency per row',
            labelNames: ['event_type'],
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
            registers: [register],
        });
    }
    catch { /* prom-client missing */ }
}
function ensureRegistrationMetrics() {
    if (registrationRequestsTotal)
        return;
    if (!init())
        return;
    try {
        registrationRequestsTotal = new client.Counter({
            name: 'dos_registration_requests_total',
            help: 'Total /register attempts',
            labelNames: ['result'],
            registers: [register],
        });
        registrationDuration = new client.Histogram({
            name: 'dos_registration_duration_seconds',
            help: '/register end-to-end latency',
            labelNames: ['result'],
            buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
            registers: [register],
        });
    }
    catch { /* prom-client missing */ }
}
function ensureOnboardingJourneyMetrics() {
    if (onboardingSessionsTotal)
        return;
    if (!init())
        return;
    try {
        onboardingSessionsTotal = new client.Counter({
            name: 'dos_onboarding_sessions_total',
            help: 'Onboarding session lifecycle events',
            labelNames: ['event', 'region', 'product'],
            registers: [register],
        });
        onboardingStagesTotal = new client.Counter({
            name: 'dos_onboarding_stages_total',
            help: 'Onboarding stage lifecycle events',
            labelNames: ['event', 'stage', 'region', 'product'],
            registers: [register],
        });
        onboardingStageDuration = new client.Histogram({
            name: 'dos_onboarding_stage_duration_seconds',
            help: 'Time spent on each onboarding stage (completed stages only)',
            labelNames: ['stage', 'region', 'product'],
            buckets: [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 14400, 28800],
            registers: [register],
        });
        onboardingProvisioningJobsTotal = new client.Counter({
            name: 'dos_onboarding_provisioning_jobs_total',
            help: 'Provisioning job lifecycle events',
            labelNames: ['result', 'region', 'product'],
            registers: [register],
        });
        onboardingProvisioningJobDuration = new client.Histogram({
            name: 'dos_onboarding_provisioning_job_duration_seconds',
            help: 'Provisioning job duration (completed/failed)',
            labelNames: ['result', 'region', 'product'],
            buckets: [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 14400],
            registers: [register],
        });
        onboardingProvisioningStepDuration = new client.Histogram({
            name: 'dos_onboarding_provisioning_step_duration_seconds',
            help: 'Provisioning step duration (completed/failed)',
            labelNames: ['step', 'result', 'region', 'product'],
            buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 1200],
            registers: [register],
        });
        onboardingFunnelSessionsGauge = new client.Gauge({
            name: 'dos_onboarding_funnel_sessions',
            help: 'Onboarding sessions by status (sampled)',
            labelNames: ['status', 'region', 'product'],
            registers: [register],
        });
        onboardingProvisioningJobsGauge = new client.Gauge({
            name: 'dos_onboarding_provisioning_jobs',
            help: 'Provisioning jobs by job_status (sampled)',
            labelNames: ['job_status', 'region', 'product'],
            registers: [register],
        });
        onboardingStageParkedOpenGauge = new client.Gauge({
            name: 'dos_onboarding_stage_parked_open',
            help: 'Sessions parked on a stage that are still in open statuses (sampled)',
            labelNames: ['stage', 'region', 'product'],
            registers: [register],
        });
        onboardingUiEventsTotal = new client.Counter({
            name: 'dos_onboarding_ui_event_total',
            help: 'Onboarding UI event ingestion counter (frontend-emitted events)',
            labelNames: ['event', 'region', 'product'],
            registers: [register],
        });
    }
    catch { /* prom-client missing */ }
}
function recordOutboxPublished(eventType, durationMs) {
    ensureOutboxMetrics();
    outboxPublishedTotal?.inc({ event_type: eventType });
    outboxPublishDuration?.observe({ event_type: eventType }, durationMs / 1000);
}
function recordOutboxFailure(eventType) {
    ensureOutboxMetrics();
    outboxFailuresTotal?.inc({ event_type: eventType });
}
function recordOutboxDead(eventType) {
    ensureOutboxMetrics();
    outboxDeadTotal?.inc({ event_type: eventType });
}
function setOutboxPending(status, count) {
    ensureOutboxMetrics();
    outboxPendingGauge?.set({ status }, count);
}
function setOutboxLagSeconds(tenantScope, seconds) {
    ensureOutboxMetrics();
    outboxLagSecondsGauge?.set({ tenant_scope: tenantScope }, seconds);
}
function recordRegistrationAttempt(result, durationMs) {
    ensureRegistrationMetrics();
    registrationRequestsTotal?.inc({ result });
    registrationDuration?.observe({ result }, durationMs / 1000);
}
function recordOnboardingSessionEvent(event, region, product) {
    ensureOnboardingJourneyMetrics();
    onboardingSessionsTotal?.inc({ event, region, product });
}
function recordOnboardingStageEvent(event, stage, region, product) {
    ensureOnboardingJourneyMetrics();
    onboardingStagesTotal?.inc({ event, stage, region, product });
}
function recordOnboardingStageDuration(stage, region, product, durationMs) {
    ensureOnboardingJourneyMetrics();
    onboardingStageDuration?.observe({ stage, region, product }, durationMs / 1000);
}
function recordOnboardingProvisioningJob(result, region, product, durationMs) {
    ensureOnboardingJourneyMetrics();
    onboardingProvisioningJobsTotal?.inc({ result, region, product });
    if (durationMs != null) {
        onboardingProvisioningJobDuration?.observe({ result, region, product }, durationMs / 1000);
    }
}
function recordOnboardingProvisioningStep(step, result, region, product, durationMs) {
    ensureOnboardingJourneyMetrics();
    if (durationMs != null) {
        onboardingProvisioningStepDuration?.observe({ step, result, region, product }, durationMs / 1000);
    }
}
function setOnboardingFunnelSessions(status, region, product, count) {
    ensureOnboardingJourneyMetrics();
    onboardingFunnelSessionsGauge?.set({ status, region, product }, count);
}
function setOnboardingProvisioningJobs(jobStatus, region, product, count) {
    ensureOnboardingJourneyMetrics();
    onboardingProvisioningJobsGauge?.set({ job_status: jobStatus, region, product }, count);
}
function setOnboardingStageParkedOpen(stage, region, product, count) {
    ensureOnboardingJourneyMetrics();
    onboardingStageParkedOpenGauge?.set({ stage, region, product }, count);
}
function recordOnboardingUiEvent(event, region, product) {
    ensureOnboardingJourneyMetrics();
    onboardingUiEventsTotal?.inc({ event, region, product });
}
// ── ClickHouse consumer metrics ──────────────────────────────────────────
let chInsertRowsTotal = null;
let chFlushTotal = null;
let chFlushFailuresTotal = null;
let chFlushDuration = null;
let chBufferDepthGauge = null;
let chHealthGauge = null;
function ensureClickHouseMetrics() {
    if (chInsertRowsTotal)
        return;
    if (!init())
        return;
    try {
        chInsertRowsTotal = new client.Counter({
            name: 'dos_clickhouse_inserted_rows_total',
            help: 'Rows successfully inserted into ClickHouse by table',
            labelNames: ['table'],
            registers: [register],
        });
        chFlushTotal = new client.Counter({
            name: 'dos_clickhouse_flushes_total',
            help: 'ClickHouse buffer flushes by table and result',
            labelNames: ['table', 'result'],
            registers: [register],
        });
        chFlushFailuresTotal = new client.Counter({
            name: 'dos_clickhouse_flush_failures_total',
            help: 'ClickHouse flush failures by table',
            labelNames: ['table'],
            registers: [register],
        });
        chFlushDuration = new client.Histogram({
            name: 'dos_clickhouse_flush_duration_seconds',
            help: 'Latency of ClickHouse buffer flushes',
            labelNames: ['table'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [register],
        });
        chBufferDepthGauge = new client.Gauge({
            name: 'dos_clickhouse_buffer_depth',
            help: 'Current in-memory ClickHouse buffer depth per table',
            labelNames: ['table'],
            registers: [register],
        });
        chHealthGauge = new client.Gauge({
            name: 'dos_clickhouse_up',
            help: 'ClickHouse reachability: 1 = healthy, 0 = unhealthy',
            registers: [register],
        });
    }
    catch { /* prom-client missing */ }
}
function recordClickHouseInsert(table, rows) {
    ensureClickHouseMetrics();
    chInsertRowsTotal?.inc({ table }, rows);
}
function recordClickHouseFlush(table, durationMs, success) {
    ensureClickHouseMetrics();
    chFlushTotal?.inc({ table, result: success ? 'success' : 'failure' });
    chFlushDuration?.observe({ table }, durationMs / 1000);
    if (!success)
        chFlushFailuresTotal?.inc({ table });
}
function setClickHouseBufferDepth(table, depth) {
    ensureClickHouseMetrics();
    chBufferDepthGauge?.set({ table }, depth);
}
function setClickHouseHealth(healthy) {
    ensureClickHouseMetrics();
    chHealthGauge?.set(healthy ? 1 : 0);
}
async function getResponseTimeSLAs() {
    if (!init())
        return { error: 'prom-client not installed' };
    const allMetrics = await register.getMetricsAsJSON();
    const httpHist = allMetrics.find((m) => m.name === 'dos_http_request_duration_seconds');
    if (!httpHist || !httpHist.values) {
        return { p50: 0, p95: 0, p99: 0, byRoute: [] };
    }
    const routeMap = new Map();
    for (const v of httpHist.values) {
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
//# sourceMappingURL=prometheus.service.js.map