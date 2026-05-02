import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProactiveLeadershipRecord } from '../contracts/proactive-leadership.contracts';

@Injectable({ providedIn: 'root' })
export class ProactiveLeadershipApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/proactive-leadership';

  list(): Observable<{ data: ProactiveLeadershipRecord[], count: number }> {
    return this.http.get<{ data: ProactiveLeadershipRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<ProactiveLeadershipRecord> {
    return this.http.get<ProactiveLeadershipRecord>(this.endpoint + '/' + id);
  }
}
