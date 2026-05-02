import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlaybooksRecord } from '../contracts/playbooks.contracts';

@Injectable({ providedIn: 'root' })
export class PlaybooksApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/playbooks';

  list(): Observable<{ data: PlaybooksRecord[], count: number }> {
    return this.http.get<{ data: PlaybooksRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<PlaybooksRecord> {
    return this.http.get<PlaybooksRecord>(this.endpoint + '/' + id);
  }
}
