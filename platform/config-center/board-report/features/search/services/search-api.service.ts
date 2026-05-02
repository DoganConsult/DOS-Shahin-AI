import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SearchApiService {
  private http = inject(HttpClient);
  private base = '/api/unified-search';

  search(query: string, params?: { module?: string; limit?: number }): Observable<any> {
    let httpParams = new HttpParams().set('q', query);
    if (params?.module) httpParams = httpParams.set('module', params.module);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    return this.http.get(this.base, { params: httpParams });
  }
}
