import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { McpRecord } from '../contracts/mcp.contracts';

@Injectable({ providedIn: 'root' })
export class McpApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/mcp';

  list(): Observable<{ data: McpRecord[], count: number }> {
    return this.http.get<{ data: McpRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<McpRecord> {
    return this.http.get<McpRecord>(this.endpoint + '/' + id);
  }
}
