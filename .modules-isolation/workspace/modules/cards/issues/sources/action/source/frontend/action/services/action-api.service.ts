import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActionRecord } from '../contracts/action.contracts';

@Injectable({ providedIn: 'root' })
export class ActionApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/action';

  list(): Observable<{ data: ActionRecord[], count: number }> {
    return this.http.get<{ data: ActionRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<ActionRecord> {
    return this.http.get<ActionRecord>(this.endpoint + '/' + id);
  }
}
