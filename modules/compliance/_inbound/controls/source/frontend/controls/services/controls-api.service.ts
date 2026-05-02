import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ControlsRecord } from '../contracts/controls.contracts';

@Injectable({ providedIn: 'root' })
export class ControlsApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/controls';

  list(): Observable<{ data: ControlsRecord[], count: number }> {
    return this.http.get<{ data: ControlsRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<ControlsRecord> {
    return this.http.get<ControlsRecord>(this.endpoint + '/' + id);
  }
}
