import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AssetRecord } from '../contracts/asset.contracts';

@Injectable({ providedIn: 'root' })
export class AssetApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/asset';

  list(): Observable<{ data: AssetRecord[], count: number }> {
    return this.http.get<{ data: AssetRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<AssetRecord> {
    return this.http.get<AssetRecord>(this.endpoint + '/' + id);
  }
}
