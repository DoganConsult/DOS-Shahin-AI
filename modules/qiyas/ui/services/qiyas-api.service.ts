import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QiyasRecord } from '../contracts/qiyas.contracts';

@Injectable({ providedIn: 'root' })
export class QiyasApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/qiyas';

  list(): Observable<{ data: QiyasRecord[], count: number }> {
    return this.http.get<{ data: QiyasRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<QiyasRecord> {
    return this.http.get<QiyasRecord>(this.endpoint + '/' + id);
  }
}
