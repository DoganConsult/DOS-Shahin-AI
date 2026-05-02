"use strict";
// Lightweight in-process metrics for the foundation module.
// Intentionally does not depend on prom-client to keep the module host-agnostic;
// the host service's observability stack can scrape FOUNDATION_METRICS.snapshot()
// via /api/foundation/metrics and forward to Prometheus / OpenTelemetry.
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMetrics = exports.FOUNDATION_METRICS = void 0;
class Counter {
    name;
    help;
    values = {};
    constructor(name, help) {
        this.name = name;
        this.help = help;
    }
    inc(label = '_', by = 1) {
        this.values[label] = (this.values[label] ?? 0) + by;
    }
    snapshot() {
        return { ...this.values };
    }
}
class Histogram {
    name;
    help;
    capacity;
    samples = [];
    sum = 0;
    count = 0;
    constructor(name, help, capacity = 1024) {
        this.name = name;
        this.help = help;
        this.capacity = capacity;
    }
    observe(ms) {
        this.sum += ms;
        this.count += 1;
        this.samples.push(ms);
        if (this.samples.length > this.capacity)
            this.samples.shift();
    }
    snapshot() {
        if (this.count === 0)
            return { count: 0, sum: 0, avgMs: 0, p95Ms: 0 };
        const sorted = [...this.samples].sort((a, b) => a - b);
        const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
        return {
            count: this.count,
            sum: this.sum,
            avgMs: this.sum / this.count,
            p95Ms: sorted[p95Idx] ?? 0,
        };
    }
}
const requestsTotal = new Counter('foundation_requests_total', 'Total HTTP requests served by foundation routers');
const requestErrors = new Counter('foundation_request_errors_total', 'Errored HTTP requests by foundation routers');
const eventsPublished = new Counter('foundation_events_published_total', 'Domain events emitted by foundation module');
const healthChecks = new Counter('foundation_health_checks_total', 'Self-health evaluations');
const requestLatency = new Histogram('foundation_request_duration_ms', 'Request latency in milliseconds');
const healthLatency = new Histogram('foundation_health_check_duration_ms', 'Health probe latency in milliseconds');
exports.FOUNDATION_METRICS = {
    requestsTotal,
    requestErrors,
    eventsPublished,
    healthChecks,
    requestLatencyMs: requestLatency,
    healthLatencyMs: healthLatency,
    snapshot() {
        return {
            requestsTotal: requestsTotal.snapshot(),
            requestErrors: requestErrors.snapshot(),
            eventsPublished: eventsPublished.snapshot(),
            healthChecks: healthChecks.snapshot(),
            requestLatencyMs: requestLatency.snapshot(),
            healthLatencyMs: healthLatency.snapshot(),
        };
    },
};
// Lightweight userMetrics facade kept for legacy call-sites within the module.
// Delegates DB observation to the foundation request-latency histogram and
// counts ops by label in a dedicated counter.
const dbOps = new Counter('foundation_db_ops_total', 'Database operations performed by foundation services');
const dbLatency = new Histogram('foundation_db_op_duration_ms', 'Database operation latency in milliseconds');
exports.userMetrics = {
    observeDb(op, durationMs) {
        dbOps.inc(op);
        dbLatency.observe(durationMs);
    },
    snapshot() {
        return { dbOps: dbOps.snapshot(), dbLatency: dbLatency.snapshot() };
    },
};
//# sourceMappingURL=metrics.js.map