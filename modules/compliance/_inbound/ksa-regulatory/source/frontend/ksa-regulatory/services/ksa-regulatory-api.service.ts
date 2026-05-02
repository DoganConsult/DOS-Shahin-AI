import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KsaRegulatoryRecord } from '../contracts/ksa-regulatory.contracts';

@Injectable({ providedIn: 'root' })
export class KsaRegulatoryApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/ksa-regulatory';

  list(): Observable<{ data: KsaRegulatoryRecord[], count: number }> {
    return this.http.get<{ data: KsaRegulatoryRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<KsaRegulatoryRecord> {
    return this.http.get<KsaRegulatoryRecord>(this.endpoint + '/' + id);
  }
}
