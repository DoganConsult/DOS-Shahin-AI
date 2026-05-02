export { createDNOCPort } from './dnoc-port.impl';
export type { DNOCPortDependencies } from './dnoc-port.impl';

export {
  getDNOCPort,
  tryGetDNOCPort,
  setDNOCPort,
  resetDNOCPort,
} from './dnoc-port.registry';

export {
  InMemoryMetricsRepository,
  PgMetricsRepository,
  InMemoryLogsRepository,
  PgLogsRepository,
  InMemoryTracesRepository,
  PgTracesRepository,
  InMemoryRoutesRepository,
  PgRoutesRepository,
  InMemoryHealthRepository,
  PgHealthRepository,
} from './repositories';
export type {
  MetricsRepository,
  LogsRepository,
  TracesRepository,
  RoutesRepository,
  HealthRepository,
} from './repositories';

export type {
  DNOCPort,
  DNOCMetric,
  DNOCMetricKind,
  DNOCLogEntry,
  DNOCLogLevel,
  DNOCTraceSpan,
  DNOCRouteDescriptor,
  DNOCHealthStatus,
} from '@dos/ports/dnoc';

// AI agent tools
export { buildDNOCAgentTools } from './agent-tools';
export type { DNOCAgentToolsDeps } from './agent-tools';

// Retention
export { runDNOCRetention, startDNOCRetentionLoop } from './retention.job';
export type {
  RetentionDeps as DNOCRetentionDeps,
  RetentionResult as DNOCRetentionResult,
  RetentionOptions as DNOCRetentionOptions,
} from './retention.job';
