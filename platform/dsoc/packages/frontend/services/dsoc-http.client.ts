/**
 * Real HTTP client for the DSOC port REST surface.
 *
 * Implements the three frontend ports (DSOCEventFeedPort,
 * DSOCAlertInboxPort, DSOCPosturePort) by calling the gateway
 * `/api/dsoc/port/v1/*` endpoints. Product shells use this OR
 * provide their own implementations.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import type {
  DSOCEventFeedPort,
  DSOCAlertInboxPort,
  DSOCPosturePort,
} from '../ports';
import type { DSOCAuditEvent, DSOCPostureSnapshot } from '@dos/ports/dsoc';

const BASE = '/api/dsoc/port/v1';

@Injectable({ providedIn: 'root' })
export class DSOCEventFeedHttpClient implements DSOCEventFeedPort {
  private http = inject(HttpClient);
  recent(tenantId: string, limit: number): Observable<readonly DSOCAuditEvent[]> {
    return this.http
      .get<{ tenantId: string; count: number; events: readonly DSOCAuditEvent[] }>(
        `${BASE}/audit-events`,
        { params: { tenantId, limit: String(limit) } },
      )
      .pipe(map((r) => r.events ?? []));
  }
}

interface AlertResponseRow {
  id: number;
  tenantId: string;
  severity: string;
  category: string;
  action: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DSOCAlertInboxHttpClient implements DSOCAlertInboxPort {
  private http = inject(HttpClient);
  listOpen(tenantId: string): Observable<readonly AlertResponseRow[]> {
    return this.http
      .get<{ tenantId: string; count: number; alerts: readonly AlertResponseRow[] }>(
        `${BASE}/alerts`,
        { params: { tenantId } },
      )
      .pipe(map((r) => r.alerts ?? []));
  }
  acknowledge(id: number, by: string): Observable<boolean> {
    return this.http
      .post<{ acknowledged: boolean }>(`${BASE}/alerts/${id}/acknowledge`, { by })
      .pipe(map((r) => !!r.acknowledged));
  }
  resolve(id: number, by: string): Observable<boolean> {
    return this.http
      .post<{ resolved: boolean }>(`${BASE}/alerts/${id}/resolve`, { by })
      .pipe(map((r) => !!r.resolved));
  }
}

@Injectable({ providedIn: 'root' })
export class DSOCPostureHttpClient implements DSOCPosturePort {
  private http = inject(HttpClient);
  latest(tenantId: string): Observable<DSOCPostureSnapshot | null> {
    return this.http
      .get<DSOCPostureSnapshot>(`${BASE}/posture/${encodeURIComponent(tenantId)}`)
      .pipe(map((r) => r ?? null));
  }
}
