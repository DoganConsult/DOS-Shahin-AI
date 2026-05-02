import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiRecord } from '../contracts/ai.contracts';

@Injectable({ providedIn: 'root' })
export class AiApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/ai';

  list(): Observable<{ data: AiRecord[], count: number }> {
    return this.http.get<{ data: AiRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<AiRecord> {
    return this.http.get<AiRecord>(this.endpoint + '/' + id);
  }

  getUnifiedDashboard(): Observable<any> {
    return this.http.get<any>(this.endpoint + '/squad/unified-squad/dashboard');
  }

  getAgentMonitoring(): Observable<any> {
    return this.http.get<any>(this.endpoint + '/squad/unified-squad/agents/monitoring');
  }

  getWorkflowTimeline(status?: string): Observable<any[]> {
    const params: any = {};
    if (status) params.status = status;
    return this.http.get<any[]>(this.endpoint + '/squad/unified-squad/workflow-timeline', { params });
  }
}
