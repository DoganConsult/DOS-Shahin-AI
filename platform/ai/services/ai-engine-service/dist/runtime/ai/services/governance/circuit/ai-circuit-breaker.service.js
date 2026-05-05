// @ts-nocheck
import { logger } from '../../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getOrCreateBreaker, } from '@dos/module-sdk';
const DEFAULT_CONFIG = {
    failureThreshold: 5,
    recoveryTimeMs: 60_000,
    halfOpenMaxProbes: 2,
    rateLimitRpm: 30,
    rateLimitTokensPerMin: 80_000,
    cooldownPerTenantMs: 5_000,
};
class AICircuitBreaker {
    config;
    breaker;
    metrics;
    tenantLastCall = new Map();
    latencyBuffer = [];
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.breaker = getOrCreateBreaker({
            name: 'ai-claude',
            failureThreshold: this.config.failureThreshold,
            recoveryTimeMs: this.config.recoveryTimeMs,
            halfOpenMaxProbes: this.config.halfOpenMaxProbes,
            onStateChange: (from, to, name) => {
                if (to === 'OPEN') {
                    logger.error(`[CircuitBreaker] TRIPPED → OPEN: ${name}`);
                }
                else if (to === 'CLOSED' && from === 'HALF_OPEN') {
                    logger.info('[CircuitBreaker] Probe succeeded — circuit CLOSED');
                }
            },
        });
        this.metrics = {
            totalCalls: 0, totalFailures: 0, totalSuccesses: 0,
            totalTokensEstimated: 0, avgLatencyMs: 0,
            lastCallAt: 0, lastFailureAt: 0,
            consecutiveFailures: 0, callsInCurrentWindow: 0,
            windowStartMs: Date.now(),
        };
    }
    getState() { return this.breaker.getState(); }
    getMetrics() {
        return {
            ...this.metrics,
            state: this.breaker.getState(),
            tenantCooldowns: this.tenantLastCall.size,
        };
    }
    getStats() {
        const bm = this.breaker.getMetrics();
        return {
            state: bm.state,
            failures: this.metrics.consecutiveFailures,
            dropped: this.metrics.totalFailures,
            inFlight: 0,
            rpm: this.metrics.callsInCurrentWindow,
            avgLatencyMs: Math.round(this.metrics.avgLatencyMs),
        };
    }
    canCall(tenantId) {
        const state = this.breaker.getState();
        if (state === 'OPEN') {
            return {
                allowed: false,
                reason: `Circuit OPEN — AI unavailable.`,
                waitMs: this.config.recoveryTimeMs,
            };
        }
        this._refreshWindow();
        if (this.metrics.callsInCurrentWindow >= this.config.rateLimitRpm) {
            const windowRemaining = 60_000 - (Date.now() - this.metrics.windowStartMs);
            return {
                allowed: false,
                reason: `Rate limit: ${this.config.rateLimitRpm} RPM exceeded`,
                waitMs: Math.max(windowRemaining, 1000),
            };
        }
        if (tenantId) {
            const lastCall = this.tenantLastCall.get(tenantId);
            if (lastCall) {
                const gap = Date.now() - lastCall;
                if (gap < this.config.cooldownPerTenantMs) {
                    return {
                        allowed: false,
                        reason: `Tenant cooldown: ${Math.ceil((this.config.cooldownPerTenantMs - gap) / 1000)}s remaining`,
                        waitMs: this.config.cooldownPerTenantMs - gap,
                    };
                }
            }
        }
        return { allowed: true, reason: 'OK' };
    }
    recordSuccess(tenantId, latencyMs, estimatedTokens = 500) {
        this.metrics.totalCalls++;
        this.metrics.totalSuccesses++;
        this.metrics.totalTokensEstimated += estimatedTokens;
        this.metrics.lastCallAt = Date.now();
        this.metrics.consecutiveFailures = 0;
        this.metrics.callsInCurrentWindow++;
        this.tenantLastCall.set(tenantId, Date.now());
        this.latencyBuffer.push(latencyMs);
        if (this.latencyBuffer.length > 100)
            this.latencyBuffer.shift();
        this.metrics.avgLatencyMs = this.latencyBuffer.reduce((a, b) => a + b, 0) / this.latencyBuffer.length;
    }
    recordFailure(tenantId, _error) {
        this.metrics.totalCalls++;
        this.metrics.totalFailures++;
        this.metrics.lastFailureAt = Date.now();
        this.metrics.lastCallAt = Date.now();
        this.metrics.consecutiveFailures++;
        this.metrics.callsInCurrentWindow++;
        this.tenantLastCall.set(tenantId, Date.now());
    }
    async guard(tenantId, callFn, _fallbackFn, estimatedTokens = 500) {
        const check = this.canCall(tenantId);
        if (!check.allowed) {
            throw new Error(`AI rate limited: ${check.reason}`);
        }
        const startMs = Date.now();
        try {
            const result = await this.breaker.execute(callFn);
            const latencyMs = Date.now() - startMs;
            this.recordSuccess(tenantId, latencyMs, estimatedTokens);
            return { result, source: 'ai', latencyMs };
        }
        catch (err) {
            this.recordFailure(tenantId, toErrorMessage(err));
            throw err;
        }
    }
    reset() {
        this.breaker.reset();
        this.metrics.consecutiveFailures = 0;
        logger.info('[CircuitBreaker] Manually reset to CLOSED');
    }
    _refreshWindow() {
        const now = Date.now();
        if (now - this.metrics.windowStartMs >= 60_000) {
            this.metrics.callsInCurrentWindow = 0;
            this.metrics.windowStartMs = now;
        }
    }
}
export const aiCircuitBreaker = new AICircuitBreaker();
export function getAllBreakerStatus() {
    const stats = aiCircuitBreaker.getStats();
    return {
        claude: {
            state: stats.state,
            failures: stats.failures,
            rpm: stats.rpm,
        },
    };
}
//# sourceMappingURL=ai-circuit-breaker.service.js.map