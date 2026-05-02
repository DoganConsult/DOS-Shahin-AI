import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiGovernanceRecord } from '../contracts/ai-governance.contracts';

@Injectable({ providedIn: 'root' })
export class AiGovernanceApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/ai-governance';

  list(): Observable<{ data: AiGovernanceRecord[], count: number }> {
    return this.http.get<{ data: AiGovernanceRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<AiGovernanceRecord> {
    return this.http.get<AiGovernanceRecord>(this.endpoint + '/' + id);
  }
}
