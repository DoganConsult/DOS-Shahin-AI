import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { KnowledgeArticleContract, LocalKnowledgeDashboardContract } from '../contracts/local-knowledge.contracts';

@Injectable({ providedIn: 'root' })
export class LocalKnowledgeApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: KnowledgeArticleContract[] }> {
    return this.http.get<{ data: KnowledgeArticleContract[] }>(`${this.base}/local-knowledge`, { params });
  }

  getById(id: string): Observable<KnowledgeArticleContract> {
    return this.http.get<KnowledgeArticleContract>(`${this.base}/local-knowledge/${id}`);
  }

  create(payload: Partial<KnowledgeArticleContract>): Observable<KnowledgeArticleContract> {
    return this.http.post<KnowledgeArticleContract>(`${this.base}/local-knowledge`, payload);
  }

  update(id: string, payload: Partial<KnowledgeArticleContract>): Observable<KnowledgeArticleContract> {
    return this.http.patch<KnowledgeArticleContract>(`${this.base}/local-knowledge/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/local-knowledge/${id}`);
  }

  getSummary(): Observable<LocalKnowledgeDashboardContract> {
    return this.http.get<LocalKnowledgeDashboardContract>(`${this.base}/local-knowledge/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/local-knowledge/diagnostics`);
  }
}
