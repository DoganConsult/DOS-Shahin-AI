import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IncidentRecord } from '../contracts/incident.contracts';

@Injectable({ providedIn: 'root' })
export class IncidentApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/incident';

  list(): Observable<{ data: IncidentRecord[], count: number }> {
    return this.http.get<{ data: IncidentRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<IncidentRecord> {
    return this.http.get<IncidentRecord>(this.endpoint + '/' + id);
  }
}
