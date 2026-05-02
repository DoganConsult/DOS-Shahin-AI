/**
 * Telemetry port — outbound interface for metrics/tracing.
 * Default: no-op counters/histograms; host wires OTel/Prometheus.
 */
export interface MetricCounter {
    inc(value?: number, labels?: Record<string, string>): void;
}
export interface MetricHistogram {
    observe(value: number, labels?: Record<string, string>): void;
}
export interface Span {
    end(): void;
    setAttribute(key: string, value: unknown): void;
    recordException(err: unknown): void;
}
export interface Tracer {
    startSpan(name: string, attrs?: Record<string, unknown>): Span;
}
export interface TelemetryAdapter {
    counter(name: string, help?: string, labelNames?: string[]): MetricCounter;
    histogram(name: string, help?: string, labelNames?: string[]): MetricHistogram;
    tracer(): Tracer;
}
export declare function bindTelemetryPort(impl: {
    adapter?: TelemetryAdapter;
}): void;
export declare const telemetry: TelemetryAdapter;
