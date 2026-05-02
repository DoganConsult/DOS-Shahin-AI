import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface ReportDelta { reportId: string; field: string; oldValue: unknown; newValue: unknown; changedAt: string; }
export interface ReportStreamEvent { type: 'delta' | 'complete' | 'error'; payload: unknown; timestamp: string; }
export interface ReportStreamConfig { reportId: string; pollIntervalMs?: number; autoReconnect?: boolean; }

@Injectable({ providedIn: 'root' })
export class ReportStreamService {
  private http = inject(HttpClient);
  private events$ = new Subject<ReportStreamEvent>();

  getDeltas(reportId: string): Observable<ReportDelta[]> { return this.http.get<ReportDelta[]>(`/api/reports/${reportId}/deltas`); }

  stream(config: ReportStreamConfig): Observable<ReportStreamEvent> {
    return this.events$.asObservable();
  }
}
