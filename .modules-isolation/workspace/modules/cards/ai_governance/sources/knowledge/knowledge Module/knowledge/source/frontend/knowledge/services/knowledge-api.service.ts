import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KnowledgeRecord } from '../contracts/knowledge.contracts';

@Injectable({ providedIn: 'root' })
export class KnowledgeApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/knowledge';

  list(): Observable<{ data: KnowledgeRecord[], count: number }> {
    return this.http.get<{ data: KnowledgeRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<KnowledgeRecord> {
    return this.http.get<KnowledgeRecord>(this.endpoint + '/' + id);
  }
}
