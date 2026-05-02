export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  recoveryTimeMs?: number;
  halfOpenMaxProbes?: number;
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is OPEN — request rejected`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitOpenError extends CircuitBreakerOpenError {
  public readonly retryAfterMs: number;
  constructor(circuitName: string, retryAfterMs = 0) {
    super(circuitName);
    this.retryAfterMs = retryAfterMs;
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenProbes = 0;
  private readonly opts: Required<Omit<CircuitBreakerOptions, 'onStateChange'>> & {
    onStateChange?: CircuitBreakerOptions['onStateChange'];
  };

  private totalRequests = 0;
  private totalFailures = 0;
  private totalRejected = 0;
  private totalSuccesses = 0;

  constructor(options: CircuitBreakerOptions) {
    this.opts = {
      name: options.name,
      failureThreshold: options.failureThreshold ?? 5,
      recoveryTimeMs: options.recoveryTimeMs ?? 60_000,
      halfOpenMaxProbes: options.halfOpenMaxProbes ?? 2,
      onStateChange: options.onStateChange,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.opts.recoveryTimeMs) {
        this.transition('HALF_OPEN');
      } else {
        this.totalRejected++;
        throw new CircuitBreakerOpenError(this.opts.name);
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenProbes >= this.opts.halfOpenMaxProbes) {
      this.totalRejected++;
      throw new CircuitBreakerOpenError(this.opts.name);
    }

    if (this.state === 'HALF_OPEN') this.halfOpenProbes++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.totalSuccesses++;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenProbes = Math.max(0, this.halfOpenProbes - 1);
      this.transition('CLOSED');
    }
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.halfOpenProbes = Math.max(0, this.halfOpenProbes - 1);
      this.transition('OPEN');
    } else if (this.failureCount >= this.opts.failureThreshold) {
      this.transition('OPEN');
    }
  }

  private transition(to: CircuitState): void {
    if (this.state === to) return;
    const from = this.state;
    this.state = to;
    if (to === 'CLOSED') {
      this.failureCount = 0;
      this.halfOpenProbes = 0;
    }
    this.opts.onStateChange?.(from, to, this.opts.name);
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getMetrics(): {
    name: string;
    state: CircuitState;
    totalRequests: number;
    totalSuccesses: number;
    totalFailures: number;
    totalRejected: number;
    failureCount: number;
    lastFailureTime: number;
  } {
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

  reset(): void {
    this.transition('CLOSED');
  }
}

const registry = new Map<string, CircuitBreaker>();

// Metrics hook — set by platform bootstrap to record state changes
let _cbMetricsHook: ((name: string, state: CircuitState) => void) | null = null;
export function setCircuitBreakerMetricsHook(hook: (name: string, state: CircuitState) => void): void {
  _cbMetricsHook = hook;
}

export function getOrCreateBreaker(options: CircuitBreakerOptions): CircuitBreaker {
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

export function getAllBreakerMetrics(): Array<ReturnType<CircuitBreaker['getMetrics']>> {
  return Array.from(registry.values()).map((b) => b.getMetrics());
}
