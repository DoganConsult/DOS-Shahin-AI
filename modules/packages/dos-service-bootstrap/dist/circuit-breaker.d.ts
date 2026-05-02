import CircuitBreaker from 'opossum';
export interface BreakerOptions extends CircuitBreaker.Options {
    /** Optional fallback invoked when the breaker is open / call fails. */
    fallback?: (...args: unknown[]) => unknown;
}
export declare function createBreaker<TArgs extends unknown[], TResult>(name: string, action: (...args: TArgs) => Promise<TResult>, opts?: BreakerOptions): CircuitBreaker<TArgs, TResult>;
export declare function getBreaker(name: string): CircuitBreaker | undefined;
export declare function listBreakerStates(): Record<string, {
    state: string;
    stats: CircuitBreaker.Stats;
}>;
//# sourceMappingURL=circuit-breaker.d.ts.map