// @ts-nocheck
import { logger } from '../../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  CircuitBreaker,
  getOrCreateBreaker,
  type CircuitState,
} from '@dos/module-sdk';
import { safeQuery } from "@dos/db";

interface CircuitConfig {
  failureThreshold: number;
  recoveryTimeMs: number;
  halfOpenMaxProbes: number;
  rateLimitRpm: number;
  rateLimitTokensPerMin: number;
  cooldownPerTenantMs: number;
}

interface CallMetrics {
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  totalTokensEstimated: number;
  avgLatencyMs: number;
  lastCallAt: number;
  lastFailureAt: number;
  consecutiveFailures: number;
  callsInCurrentWindow: number;
  windowStartMs: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  recoveryTimeMs: 60_000,
  halfOpenMaxProbes: 2,
  rateLimitRpm: 30,
  rateLimitTokensPerMin: 80_000,
  cooldownPerTenantMs: 5_000,
};

class AICircuitBreaker {
  private config: CircuitConfig;
  private breaker: CircuitBreaker;
  private metrics: CallMetrics;
  private tenantLastCall = new Map<string, number>();
  private latencyBuffer: number[] = [];

  constructor(config?: Partial<CircuitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.breaker = getOrCreateBreaker({
      name: 'ai-claude',
      failureThreshold: this.config.failureThreshold,
      recoveryTimeMs: this.config.recoveryTimeMs,
      halfOpenMaxProbes: this.config.halfOpenMaxProbes,
      onStateChange: (from, to, name) => {
        if (to === 'OPEN') {
          logger.error(`[CircuitBreaker] TRIPPED → OPEN: ${name}`);
        } else if (to === 'CLOSED' && from === 'HALF_OPEN') {
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

  getState(): CircuitState { return this.breaker.getState(); }

  getMetrics(): CallMetrics & { state: CircuitState; tenantCooldowns: number } {
    return {
      ...this.metrics,
      state: this.breaker.getState(),
      tenantCooldowns: this.tenantLastCall.size,
    };
  }

  getStats(): { state: CircuitState; failures: number; dropped: number; inFlight: number; rpm: number; avgLatencyMs: number } {
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

  canCall(tenantId?: string): { allowed: boolean; reason: string; waitMs?: number } {
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

  recordSuccess(tenantId: string, latencyMs: number, estimatedTokens: number = 500): void {
    this.metrics.totalCalls++;
    this.metrics.totalSuccesses++;
    this.metrics.totalTokensEstimated += estimatedTokens;
    this.metrics.lastCallAt = Date.now();
    this.metrics.consecutiveFailures = 0;
    this.metrics.callsInCurrentWindow++;
    this.tenantLastCall.set(tenantId, Date.now());

    this.latencyBuffer.push(latencyMs);
    if (this.latencyBuffer.length > 100) this.latencyBuffer.shift();
    this.metrics.avgLatencyMs = this.latencyBuffer.reduce((a, b) => a + b, 0) / this.latencyBuffer.length;
  }

  recordFailure(tenantId: string, _error: string): void {
    this.metrics.totalCalls++;
    this.metrics.totalFailures++;
    this.metrics.lastFailureAt = Date.now();
    this.metrics.lastCallAt = Date.now();
    this.metrics.consecutiveFailures++;
    this.metrics.callsInCurrentWindow++;
    this.tenantLastCall.set(tenantId, Date.now());
  }

  async guard<T>(
    tenantId: string,
    callFn: () => Promise<T>,
    _fallbackFn: () => T,
    estimatedTokens: number = 500,
  ): Promise<{ result: T; source: 'ai' | 'fallback'; latencyMs: number }> {
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
    } catch (err: unknown) {
      this.recordFailure(tenantId, toErrorMessage(err));
      throw err;
    }
  }

  reset(): void {
    this.breaker.reset();
    this.metrics.consecutiveFailures = 0;
    logger.info('[CircuitBreaker] Manually reset to CLOSED');
  }

  private _refreshWindow(): void {
    const now = Date.now();
    if (now - this.metrics.windowStartMs >= 60_000) {
      this.metrics.callsInCurrentWindow = 0;
      this.metrics.windowStartMs = now;
    }
  }
}

export const aiCircuitBreaker = new AICircuitBreaker();

export function getAllBreakerStatus(): Record<string, { state: string; failures: number; rpm: number }> {
  const stats = aiCircuitBreaker.getStats();
  return {
    claude: {
      state: stats.state,
      failures: stats.failures,
      rpm: stats.rpm,
    },
  };
}
