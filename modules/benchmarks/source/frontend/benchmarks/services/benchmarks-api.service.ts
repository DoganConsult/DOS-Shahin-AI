import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BenchmarksRecord } from '../contracts/benchmarks.contracts';

@Injectable({ providedIn: 'root' })
export class BenchmarksApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/benchmarks';

  list(): Observable<{ data: BenchmarksRecord[], count: number }> {
    return this.http.get<{ data: BenchmarksRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<BenchmarksRecord> {
    return this.http.get<BenchmarksRecord>(this.endpoint + '/' + id);
  }
}
