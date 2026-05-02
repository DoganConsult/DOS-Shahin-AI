/**
 * DNOCPort — public surface of the DNOC (Network / Observability) platform
 * module.
 *
 * Status: Interface-only for now. DNOC module itself is bootstrapped in a
 * later session; platform modules consume observability today via
 * @dos/platform-core/observability and will migrate to DNOCPort when DNOC
 * lands.
 */

export type DNOCMetricKind = 'counter' | 'gauge' | 'histogram';

export interface DNOCMetric {
  readonly name: string;
  readonly kind: DNOCMetricKind;
  readonly value: number;
  readonly labels?: Readonly<Record<string, string>>;
  readonly timestamp?: string;
}

export type DNOCLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface DNOCLogEntry {
  readonly level: DNOCLogLevel;
  readonly message: string;
  readonly moduleCode: string;
  readonly tenantId?: string;
  readonly correlationId?: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface DNOCTraceSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface DNOCRouteDescriptor {
  readonly moduleCode: string;
  readonly serviceCode: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly authRequired: boolean;
  readonly rateLimit?: { readonly rpm: number };
}

export type DNOCHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface DNOCPort {
  recordMetric(metric: DNOCMetric): void;
  emitLog(entry: DNOCLogEntry): void;
  emitSpan(span: DNOCTraceSpan): void;
  registerRoute(route: DNOCRouteDescriptor): void;
  getHealth(serviceCode: string): Promise<DNOCHealthStatus>;
}
