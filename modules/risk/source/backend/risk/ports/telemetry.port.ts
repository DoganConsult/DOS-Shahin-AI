export {
  bindModuleTelemetry,
  resetModuleTelemetry,
  recordMetric,
  emitLog,
  emitSpan,
  registerRoute,
  getHealth,
} from '@dos/module-telemetry';

export type {
  DNOCMetric,
  DNOCMetricKind,
  DNOCLogEntry,
  DNOCLogLevel,
  DNOCTraceSpan,
  DNOCRouteDescriptor,
  DNOCHealthStatus,
  DNOCPort,
} from '@dos/module-telemetry';
