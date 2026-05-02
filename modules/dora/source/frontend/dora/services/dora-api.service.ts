import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DoraRecord } from '../contracts/dora.contracts';

@Injectable({ providedIn: 'root' })
export class DoraApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/dora';

  list(): Observable<{ data: DoraRecord[], count: number }> {
    return this.http.get<{ data: DoraRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<DoraRecord> {
    return this.http.get<DoraRecord>(this.endpoint + '/' + id);
  }
}
