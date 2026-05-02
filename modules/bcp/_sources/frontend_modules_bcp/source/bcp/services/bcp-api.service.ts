import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BcpRecord } from '../contracts/bcp.contracts';

@Injectable({ providedIn: 'root' })
export class BcpApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/bcp';

  list(): Observable<{ data: BcpRecord[], count: number }> {
    return this.http.get<{ data: BcpRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<BcpRecord> {
    return this.http.get<BcpRecord>(this.endpoint + '/' + id);
  }
}
