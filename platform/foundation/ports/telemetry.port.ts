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

const noopSpan: Span = { end() {}, setAttribute() {}, recordException() {} };
const noopTracer: Tracer = { startSpan: () => noopSpan };

const defaultAdapter: TelemetryAdapter = {
  counter: () => ({ inc() {} }),
  histogram: () => ({ observe() {} }),
  tracer: () => noopTracer,
};

let _adapter: TelemetryAdapter = defaultAdapter;

export function bindTelemetryPort(impl: { adapter?: TelemetryAdapter }) {
  if (impl.adapter) _adapter = impl.adapter;
}

export const telemetry: TelemetryAdapter = {
  counter: (n, h, l) => _adapter.counter(n, h, l),
  histogram: (n, h, l) => _adapter.histogram(n, h, l),
  tracer: () => _adapter.tracer(),
};
