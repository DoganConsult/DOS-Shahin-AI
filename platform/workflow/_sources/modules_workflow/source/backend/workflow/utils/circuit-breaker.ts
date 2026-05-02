export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  successThreshold?: number;
  timeoutMs?: number;
  recoveryTimeMs?: number;
  halfOpenMaxCalls?: number;
}

export class CircuitOpenError extends Error {
  readonly code = 'CIRCUIT_OPEN';
  readonly statusCode = 503;
  constructor(message: string = 'Circuit breaker is open — upstream service unavailable') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreakerOpenError extends CircuitOpenError {
  constructor(message?: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenCallCount = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeoutMs: number;
  private readonly halfOpenMaxCalls: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeoutMs = options.timeoutMs ?? options.recoveryTimeMs ?? 30_000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls ?? 3;
  }

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.timeoutMs) {
        this.state = 'half_open';
        this.halfOpenCallCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  async wrap<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new CircuitOpenError();
    }

    if (this.state === 'half_open') {
      if (this.halfOpenCallCount >= this.halfOpenMaxCalls) {
        throw Object.assign(
          new Error('Circuit breaker is half-open — request limit reached'),
          { code: 'CIRCUIT_HALF_OPEN', statusCode: 503 },
        );
      }
      this.halfOpenCallCount++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.wrap(fn);
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'half_open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    if (this.state === 'half_open' || this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.failureCount = 0;
      this.successCount = 0;
    }
  }

  getState(): CircuitState {
    this.isOpen();
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCallCount = 0;
    this.lastFailureTime = 0;
  }
}

const breakers = new Map<string, CircuitBreaker>();

export function getOrCreateBreaker(options: CircuitBreakerOptions & { name: string }): CircuitBreaker {
  const existing = breakers.get(options.name);
  if (existing) return existing;
  const breaker = new CircuitBreaker(options);
  breakers.set(options.name, breaker);
  return breaker;
}

export function getAllBreakerMetrics(): Array<{
  name: string;
  state: CircuitState;
}> {
  return Array.from(breakers.entries()).map(([name, breaker]) => ({
    name,
    state: breaker.getState(),
  }));
}

const circuitBreaker = new CircuitBreaker();
export default circuitBreaker;
