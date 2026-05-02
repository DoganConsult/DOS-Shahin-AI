import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GovernanceAiRecord } from '../contracts/governance-ai.contracts';

@Injectable({ providedIn: 'root' })
export class GovernanceAiApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/governance-ai';

  list(): Observable<{ data: GovernanceAiRecord[], count: number }> {
    return this.http.get<{ data: GovernanceAiRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<GovernanceAiRecord> {
    return this.http.get<GovernanceAiRecord>(this.endpoint + '/' + id);
  }
}
