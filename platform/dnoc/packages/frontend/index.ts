/**
 * @dos/dnoc-frontend — Angular DI surface for DNOC consumers.
 */

export {
  DNOC_METRICS_FEED_PORT,
  DNOC_LOG_STREAM_PORT,
  DNOC_TRACE_TIMELINE_PORT,
  DNOC_ROUTE_REGISTRY_PORT,
  DNOC_SERVICE_HEALTH_PORT,
} from './ports';

export type {
  DNOCMetricsFeedPort,
  DNOCLogStreamPort,
  DNOCTraceTimelinePort,
  DNOCRouteRegistryPort,
  DNOCServiceHealthPort,
} from './ports';

export {
  DNOCMetricsFeedHttpClient,
  DNOCLogStreamHttpClient,
  DNOCTraceTimelineHttpClient,
  DNOCRouteRegistryHttpClient,
  DNOCServiceHealthHttpClient,
} from './services/dnoc-http.client';

export { DnocMetricsDashboardComponent } from './components/metrics-dashboard/dnoc-metrics-dashboard.component';
