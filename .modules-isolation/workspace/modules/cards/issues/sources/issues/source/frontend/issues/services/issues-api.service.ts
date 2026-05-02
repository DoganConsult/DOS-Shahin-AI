import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IssuesRecord } from '../contracts/issues.contracts';

@Injectable({ providedIn: 'root' })
export class IssuesApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/issues';

  list(): Observable<{ data: IssuesRecord[], count: number }> {
    return this.http.get<{ data: IssuesRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<IssuesRecord> {
    return this.http.get<IssuesRecord>(this.endpoint + '/' + id);
  }
}
