import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecordsRecord } from '../contracts/records.contracts';

@Injectable({ providedIn: 'root' })
export class RecordsApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/records';

  list(): Observable<{ data: RecordsRecord[], count: number }> {
    return this.http.get<{ data: RecordsRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<RecordsRecord> {
    return this.http.get<RecordsRecord>(this.endpoint + '/' + id);
  }
}
