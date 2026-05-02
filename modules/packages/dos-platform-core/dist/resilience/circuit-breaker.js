"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.CircuitOpenError = exports.CircuitBreakerOpenError = void 0;
exports.setCircuitBreakerMetricsHook = setCircuitBreakerMetricsHook;
exports.getOrCreateBreaker = getOrCreateBreaker;
exports.getAllBreakerMetrics = getAllBreakerMetrics;
class CircuitBreakerOpenError extends Error {
    constructor(name) {
        super(`Circuit breaker '${name}' is OPEN — request rejected`);
        this.name = 'CircuitBreakerOpenError';
    }
}
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
class CircuitOpenError extends CircuitBreakerOpenError {
    retryAfterMs;
    constructor(circuitName, retryAfterMs = 0) {
        super(circuitName);
        this.retryAfterMs = retryAfterMs;
        this.name = 'CircuitOpenError';
    }
}
exports.CircuitOpenError = CircuitOpenError;
class CircuitBreaker {
    state = 'CLOSED';
    failureCount = 0;
    lastFailureTime = 0;
    halfOpenProbes = 0;
    opts;
    totalRequests = 0;
    totalFailures = 0;
    totalRejected = 0;
    totalSuccesses = 0;
    constructor(options) {
        this.opts = {
            name: options.name,
            failureThreshold: options.failureThreshold ?? 5,
            recoveryTimeMs: options.recoveryTimeMs ?? 60_000,
            halfOpenMaxProbes: options.halfOpenMaxProbes ?? 2,
            onStateChange: options.onStateChange,
        };
    }
    async execute(fn) {
        this.totalRequests++;
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime >= this.opts.recoveryTimeMs) {
                this.transition('HALF_OPEN');
            }
            else {
                this.totalRejected++;
                throw new CircuitBreakerOpenError(this.opts.name);
            }
        }
        if (this.state === 'HALF_OPEN' && this.halfOpenProbes >= this.opts.halfOpenMaxProbes) {
            this.totalRejected++;
            throw new CircuitBreakerOpenError(this.opts.name);
        }
        if (this.state === 'HALF_OPEN')
            this.halfOpenProbes++;
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (err) {
            this.onFailure();
            throw err;
        }
    }
    onSuccess() {
        this.totalSuccesses++;
        if (this.state === 'HALF_OPEN') {
            this.halfOpenProbes = Math.max(0, this.halfOpenProbes - 1);
            this.transition('CLOSED');
        }
        this.failureCount = 0;
    }
    onFailure() {
        this.totalFailures++;
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === 'HALF_OPEN') {
            this.halfOpenProbes = Math.max(0, this.halfOpenProbes - 1);
            this.transition('OPEN');
        }
        else if (this.failureCount >= this.opts.failureThreshold) {
            this.transition('OPEN');
        }
    }
    transition(to) {
        if (this.state === to)
            return;
        const from = this.state;
        this.state = to;
        if (to === 'CLOSED') {
            this.failureCount = 0;
            this.halfOpenProbes = 0;
        }
        this.opts.onStateChange?.(from, to, this.opts.name);
    }
    getState() {
        return this.state;
    }
    getFailureCount() {
        return this.failureCount;
    }
    getMetrics() {
        return {
            name: this.opts.name,
            state: this.state,
            totalRequests: this.totalRequests,
            totalSuccesses: this.totalSuccesses,
            totalFailures: this.totalFailures,
            totalRejected: this.totalRejected,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
        };
    }
    reset() {
        this.transition('CLOSED');
    }
}
exports.CircuitBreaker = CircuitBreaker;
const registry = new Map();
// Metrics hook — set by platform bootstrap to record state changes
let _cbMetricsHook = null;
function setCircuitBreakerMetricsHook(hook) {
    _cbMetricsHook = hook;
}
function getOrCreateBreaker(options) {
    const originalOnStateChange = options.onStateChange;
    options.onStateChange = (from, to, name) => {
        originalOnStateChange?.(from, to, name);
        _cbMetricsHook?.(name, to);
    };
    let breaker = registry.get(options.name);
    if (!breaker) {
        breaker = new CircuitBreaker(options);
        registry.set(options.name, breaker);
    }
    return breaker;
}
function getAllBreakerMetrics() {
    return Array.from(registry.values()).map((b) => b.getMetrics());
}
//# sourceMappingURL=circuit-breaker.js.map