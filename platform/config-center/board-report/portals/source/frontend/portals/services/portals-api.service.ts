import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PortalsRecord } from '../contracts/portals.contracts';

@Injectable({ providedIn: 'root' })
export class PortalsApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/portals';

  list(): Observable<{ data: PortalsRecord[], count: number }> {
    return this.http.get<{ data: PortalsRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<PortalsRecord> {
    return this.http.get<PortalsRecord>(this.endpoint + '/' + id);
  }
}
