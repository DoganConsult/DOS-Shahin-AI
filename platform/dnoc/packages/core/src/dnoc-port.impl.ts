import type {
  DNOCPort,
  DNOCMetric,
  DNOCLogEntry,
  DNOCTraceSpan,
  DNOCRouteDescriptor,
  DNOCHealthStatus,
} from '@dos/ports/dnoc';
import type {
  MetricsRepository,
  LogsRepository,
  TracesRepository,
  RoutesRepository,
  HealthRepository,
} from './repositories';

export interface DNOCPortDependencies {
  readonly metrics: MetricsRepository;
  readonly logs: LogsRepository;
  readonly traces: TracesRepository;
  readonly routes: RoutesRepository;
  readonly health: HealthRepository;
}

/**
 * Synchronous-fire-and-forget semantics for recordMetric / emitLog /
 * emitSpan (per DNOCPort.ts type signatures). Registration and health
 * are async because they are request/response.
 */
export function createDNOCPort(deps: DNOCPortDependencies): DNOCPort {
  return {
    recordMetric(metric: DNOCMetric): void {
      deps.metrics.record(metric);
    },
    emitLog(entry: DNOCLogEntry): void {
      deps.logs.emit(entry);
    },
    emitSpan(span: DNOCTraceSpan): void {
      deps.traces.emit(span);
    },
    registerRoute(route: DNOCRouteDescriptor): void {
      void deps.routes.register(route).catch(() => { /* silent — route-registry writes are non-critical */ });
    },
    async getHealth(serviceCode: string): Promise<DNOCHealthStatus> {
      return deps.health.latest(serviceCode);
    },
  };
}
