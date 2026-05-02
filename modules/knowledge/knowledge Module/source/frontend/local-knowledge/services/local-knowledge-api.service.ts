import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalKnowledgeRecord } from '../contracts/local-knowledge.contracts';

@Injectable({ providedIn: 'root' })
export class LocalKnowledgeApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/local-knowledge';

  list(): Observable<{ data: LocalKnowledgeRecord[], count: number }> {
    return this.http.get<{ data: LocalKnowledgeRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<LocalKnowledgeRecord> {
    return this.http.get<LocalKnowledgeRecord>(this.endpoint + '/' + id);
  }
}
