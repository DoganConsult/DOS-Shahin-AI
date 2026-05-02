export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export interface CircuitBreakerOptions {
    name: string;
    failureThreshold?: number;
    recoveryTimeMs?: number;
    halfOpenMaxProbes?: number;
    onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}
export declare class CircuitBreakerOpenError extends Error {
    constructor(name: string);
}
export declare class CircuitOpenError extends CircuitBreakerOpenError {
    readonly retryAfterMs: number;
    constructor(circuitName: string, retryAfterMs?: number);
}
export declare class CircuitBreaker {
    private state;
    private failureCount;
    private lastFailureTime;
    private halfOpenProbes;
    private readonly opts;
    private totalRequests;
    private totalFailures;
    private totalRejected;
    private totalSuccesses;
    constructor(options: CircuitBreakerOptions);
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private transition;
    getState(): CircuitState;
    getFailureCount(): number;
    getMetrics(): {
        name: string;
        state: CircuitState;
        totalRequests: number;
        totalSuccesses: number;
        totalFailures: number;
        totalRejected: number;
        failureCount: number;
        lastFailureTime: number;
    };
    reset(): void;
}
export declare function setCircuitBreakerMetricsHook(hook: (name: string, state: CircuitState) => void): void;
export declare function getOrCreateBreaker(options: CircuitBreakerOptions): CircuitBreaker;
export declare function getAllBreakerMetrics(): Array<ReturnType<CircuitBreaker['getMetrics']>>;
