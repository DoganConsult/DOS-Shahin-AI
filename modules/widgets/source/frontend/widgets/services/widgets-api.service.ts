import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WidgetsRecord } from '../contracts/widgets.contracts';

@Injectable({ providedIn: 'root' })
export class WidgetsApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/widgets';

  list(): Observable<{ data: WidgetsRecord[], count: number }> {
    return this.http.get<{ data: WidgetsRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<WidgetsRecord> {
    return this.http.get<WidgetsRecord>(this.endpoint + '/' + id);
  }
}
