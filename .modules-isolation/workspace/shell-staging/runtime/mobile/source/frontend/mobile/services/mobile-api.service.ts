import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MobileRecord } from '../contracts/mobile.contracts';

@Injectable({ providedIn: 'root' })
export class MobileApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/mobile';

  list(): Observable<{ data: MobileRecord[], count: number }> {
    return this.http.get<{ data: MobileRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<MobileRecord> {
    return this.http.get<MobileRecord>(this.endpoint + '/' + id);
  }
}
