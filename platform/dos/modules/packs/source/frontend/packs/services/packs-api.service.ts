import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PacksRecord } from '../contracts/packs.contracts';

@Injectable({ providedIn: 'root' })
export class PacksApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/packs';

  list(): Observable<{ data: PacksRecord[], count: number }> {
    return this.http.get<{ data: PacksRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<PacksRecord> {
    return this.http.get<PacksRecord>(this.endpoint + '/' + id);
  }
}
