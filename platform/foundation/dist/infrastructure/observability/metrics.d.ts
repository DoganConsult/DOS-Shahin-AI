type CounterBag = Record<string, number>;
declare class Counter {
    readonly name: string;
    readonly help: string;
    private readonly values;
    constructor(name: string, help: string);
    inc(label?: string, by?: number): void;
    snapshot(): CounterBag;
}
declare class Histogram {
    readonly name: string;
    readonly help: string;
    private readonly capacity;
    private samples;
    private sum;
    private count;
    constructor(name: string, help: string, capacity?: number);
    observe(ms: number): void;
    snapshot(): {
        count: number;
        sum: number;
        avgMs: number;
        p95Ms: number;
    };
}
export declare const FOUNDATION_METRICS: {
    requestsTotal: Counter;
    requestErrors: Counter;
    eventsPublished: Counter;
    healthChecks: Counter;
    requestLatencyMs: Histogram;
    healthLatencyMs: Histogram;
    snapshot(): {
        requestsTotal: CounterBag;
        requestErrors: CounterBag;
        eventsPublished: CounterBag;
        healthChecks: CounterBag;
        requestLatencyMs: {
            count: number;
            sum: number;
            avgMs: number;
            p95Ms: number;
        };
        healthLatencyMs: {
            count: number;
            sum: number;
            avgMs: number;
            p95Ms: number;
        };
    };
};
export type FoundationMetrics = typeof FOUNDATION_METRICS;
export declare const userMetrics: {
    observeDb(op: string, durationMs: number): void;
    snapshot(): {
        dbOps: CounterBag;
        dbLatency: {
            count: number;
            sum: number;
            avgMs: number;
            p95Ms: number;
        };
    };
};
export {};
