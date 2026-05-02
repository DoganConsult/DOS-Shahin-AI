/**
 * AGRC-OS Service — frontend port to the agrc-os-service backend.
 *
 * Backend lives at services/agrc-os-service. The frontend service was
 * lost during the compliance UI extraction; this implementation reads
 * the two methods that compliance UI consumes (getMetrics, getMonitoredControls)
 * from the backend's standard endpoints.
 *
 * Endpoints (per services/agrc-os-service routes):
 *   GET /api/agrc-os/metrics           → { cycleCount, enforcementRate, eventCount, ... }
 *   GET /api/agrc-os/controls/monitored?limit=N
 *                                       → { controls: [...], byFramework: {}, frameworkIds: [] }
 *
 * Both endpoints fall back to empty results on auth/network failure so
 * compliance dashboards degrade gracefully rather than crashing.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AgrcOsMetrics {
  cycleCount?: number;
  enforcementRate?: number;
  eventCount?: number;
  [key: string]: unknown;
}

export interface AgrcOsMonitoredControl {
  control_id?: string;
  controlId?: string;
  id?: string;
  title?: string;
  name?: string;
  framework_id?: string;
  frameworkId?: string;
  [key: string]: unknown;
}

export interface AgrcOsMonitoredControlsResponse {
  controls: AgrcOsMonitoredControl[];
  byFramework: Record<string, AgrcOsMonitoredControl[]>;
  frameworkIds: string[];
}

@Injectable({ providedIn: 'root' })
export class AGRCOSService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/agrc-os';

  getMetrics(): Observable<AgrcOsMetrics | null> {
    return this.http
      .get<AgrcOsMetrics>(`${this.base}/metrics`, { withCredentials: true })
      .pipe(catchError(() => of(null)));
  }

  getMonitoredControls(limit = 100): Observable<AgrcOsMonitoredControlsResponse> {
    return this.http
      .get<AgrcOsMonitoredControlsResponse>(
        `${this.base}/controls/monitored?limit=${encodeURIComponent(String(limit))}`,
        { withCredentials: true },
      )
      .pipe(
        catchError(() =>
          of<AgrcOsMonitoredControlsResponse>({
            controls: [],
            byFramework: {},
            frameworkIds: [],
          }),
        ),
      );
  }
}
