import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExecutiveRecord } from '../contracts/executive.contracts';

@Injectable({ providedIn: 'root' })
export class ExecutiveApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/executive';

  list(): Observable<{ data: ExecutiveRecord[], count: number }> {
    return this.http.get<{ data: ExecutiveRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<ExecutiveRecord> {
    return this.http.get<ExecutiveRecord>(this.endpoint + '/' + id);
  }
}
