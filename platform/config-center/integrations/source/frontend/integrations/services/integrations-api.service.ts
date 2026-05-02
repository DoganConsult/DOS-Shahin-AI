import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IntegrationsRecord } from '../contracts/integrations.contracts';

@Injectable({ providedIn: 'root' })
export class IntegrationsApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/integrations';

  list(): Observable<{ data: IntegrationsRecord[], count: number }> {
    return this.http.get<{ data: IntegrationsRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<IntegrationsRecord> {
    return this.http.get<IntegrationsRecord>(this.endpoint + '/' + id);
  }
}
