import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AgrcEngineRecord } from '../contracts/agrc-engine.contracts';

@Injectable({ providedIn: 'root' })
export class AgrcEngineApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/agrc-engine';

  list(): Observable<{ data: AgrcEngineRecord[], count: number }> {
    return this.http.get<{ data: AgrcEngineRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<AgrcEngineRecord> {
    return this.http.get<AgrcEngineRecord>(this.endpoint + '/' + id);
  }
}
