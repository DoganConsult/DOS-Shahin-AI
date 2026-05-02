import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExceptionRecord } from '../contracts/exception.contracts';

@Injectable({ providedIn: 'root' })
export class ExceptionApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/exception';

  list(): Observable<{ data: ExceptionRecord[], count: number }> {
    return this.http.get<{ data: ExceptionRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<ExceptionRecord> {
    return this.http.get<ExceptionRecord>(this.endpoint + '/' + id);
  }
}
