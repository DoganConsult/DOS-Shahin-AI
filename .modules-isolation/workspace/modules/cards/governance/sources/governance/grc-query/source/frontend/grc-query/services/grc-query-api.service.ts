import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GrcQueryRecord } from '../contracts/grc-query.contracts';

@Injectable({ providedIn: 'root' })
export class GrcQueryApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/grc-query';

  list(): Observable<{ data: GrcQueryRecord[], count: number }> {
    return this.http.get<{ data: GrcQueryRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<GrcQueryRecord> {
    return this.http.get<GrcQueryRecord>(this.endpoint + '/' + id);
  }
}
