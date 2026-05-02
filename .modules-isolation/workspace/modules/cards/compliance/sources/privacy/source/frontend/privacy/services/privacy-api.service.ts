import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PrivacyRecord } from '../contracts/privacy.contracts';

@Injectable({ providedIn: 'root' })
export class PrivacyApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/privacy';

  list(): Observable<{ data: PrivacyRecord[], count: number }> {
    return this.http.get<{ data: PrivacyRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<PrivacyRecord> {
    return this.http.get<PrivacyRecord>(this.endpoint + '/' + id);
  }
}
