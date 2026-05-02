import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InboxRecord } from '../contracts/inbox.contracts';

@Injectable({ providedIn: 'root' })
export class InboxApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/inbox';

  list(): Observable<{ data: InboxRecord[], count: number }> {
    return this.http.get<{ data: InboxRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<InboxRecord> {
    return this.http.get<InboxRecord>(this.endpoint + '/' + id);
  }
}
