/**
 * DNOC frontend injection ports. Product shells provide concrete
 * implementations (typically HTTP clients pointed at /api/dnoc/port/v1).
 */

import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  DNOCMetric,
  DNOCLogEntry,
  DNOCTraceSpan,
  DNOCRouteDescriptor,
  DNOCHealthStatus,
} from '@dos/ports/dnoc';

export interface DNOCMetricsFeedPort {
  recent(name: string, limit: number): Observable<readonly DNOCMetric[]>;
}

export interface DNOCLogStreamPort {
  recent(moduleCode: string, limit: number): Observable<readonly DNOCLogEntry[]>;
}

export interface DNOCTraceTimelinePort {
  byTraceId(traceId: string): Observable<readonly DNOCTraceSpan[]>;
}

export interface DNOCRouteRegistryPort {
  listActive(serviceCode: string): Observable<readonly DNOCRouteDescriptor[]>;
}

export interface DNOCServiceHealthPort {
  current(serviceCode: string): Observable<DNOCHealthStatus>;
}

export const DNOC_METRICS_FEED_PORT = new InjectionToken<DNOCMetricsFeedPort>('DNOCMetricsFeedPort');
export const DNOC_LOG_STREAM_PORT = new InjectionToken<DNOCLogStreamPort>('DNOCLogStreamPort');
export const DNOC_TRACE_TIMELINE_PORT = new InjectionToken<DNOCTraceTimelinePort>('DNOCTraceTimelinePort');
export const DNOC_ROUTE_REGISTRY_PORT = new InjectionToken<DNOCRouteRegistryPort>('DNOCRouteRegistryPort');
export const DNOC_SERVICE_HEALTH_PORT = new InjectionToken<DNOCServiceHealthPort>('DNOCServiceHealthPort');
