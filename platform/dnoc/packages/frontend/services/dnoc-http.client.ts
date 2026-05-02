/**
 * Real HTTP clients for the DNOC port REST surface.
 * Implements the five frontend ports against /api/dnoc/port/v1/*.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import type {
  DNOCMetricsFeedPort,
  DNOCLogStreamPort,
  DNOCTraceTimelinePort,
  DNOCRouteRegistryPort,
  DNOCServiceHealthPort,
} from '../ports';
import type {
  DNOCMetric,
  DNOCLogEntry,
  DNOCTraceSpan,
  DNOCRouteDescriptor,
  DNOCHealthStatus,
} from '@dos/ports/dnoc';

const BASE = '/api/dnoc/port/v1';

@Injectable({ providedIn: 'root' })
export class DNOCMetricsFeedHttpClient implements DNOCMetricsFeedPort {
  private http = inject(HttpClient);
  recent(name: string, limit: number): Observable<readonly DNOCMetric[]> {
    return this.http
      .get<{ name: string; count: number; samples: readonly DNOCMetric[] }>(
        `${BASE}/metrics`,
        { params: { name, limit: String(limit) } },
      )
      .pipe(map((r) => r.samples ?? []));
  }
}

@Injectable({ providedIn: 'root' })
export class DNOCLogStreamHttpClient implements DNOCLogStreamPort {
  private http = inject(HttpClient);
  recent(moduleCode: string, limit: number): Observable<readonly DNOCLogEntry[]> {
    return this.http
      .get<{ moduleCode: string; count: number; entries: readonly DNOCLogEntry[] }>(
        `${BASE}/logs`,
        { params: { moduleCode, limit: String(limit) } },
      )
      .pipe(map((r) => r.entries ?? []));
  }
}

@Injectable({ providedIn: 'root' })
export class DNOCTraceTimelineHttpClient implements DNOCTraceTimelinePort {
  private http = inject(HttpClient);
  byTraceId(traceId: string): Observable<readonly DNOCTraceSpan[]> {
    return this.http
      .get<{ traceId: string; spanCount: number; spans: readonly DNOCTraceSpan[] }>(
        `${BASE}/traces/${encodeURIComponent(traceId)}`,
      )
      .pipe(map((r) => r.spans ?? []));
  }
}

@Injectable({ providedIn: 'root' })
export class DNOCRouteRegistryHttpClient implements DNOCRouteRegistryPort {
  private http = inject(HttpClient);
  listActive(serviceCode: string): Observable<readonly DNOCRouteDescriptor[]> {
    return this.http
      .get<{ serviceCode: string; count: number; routes: readonly DNOCRouteDescriptor[] }>(
        `${BASE}/routes`,
        { params: { serviceCode } },
      )
      .pipe(map((r) => r.routes ?? []));
  }
}

@Injectable({ providedIn: 'root' })
export class DNOCServiceHealthHttpClient implements DNOCServiceHealthPort {
  private http = inject(HttpClient);
  current(serviceCode: string): Observable<DNOCHealthStatus> {
    return this.http
      .get<{ serviceCode: string; status: DNOCHealthStatus }>(
        `${BASE}/health/${encodeURIComponent(serviceCode)}`,
      )
      .pipe(map((r) => r.status));
  }
}
