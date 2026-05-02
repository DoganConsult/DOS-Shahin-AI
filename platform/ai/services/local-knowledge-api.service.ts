import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface LocalKnowledgeSource {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  documentCount?: number;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestionLogItem {
  id: string;
  sourceId: string;
  sourceName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  documentsProcessed?: number;
  errorsCount?: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface KnowledgeDocument {
  id: string;
  sourceId: string;
  title: string;
  content?: string;
  status: 'draft' | 'indexed' | 'published' | 'archived';
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface PublishedKnowledge {
  id: string;
  documentId: string;
  title: string;
  summary?: string;
  status: 'published' | 'unpublished';
  publishedAt: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class LocalKnowledgeApiService {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/local-knowledge`;

  listSources(): Observable<{ items: LocalKnowledgeSource[] }> {
    return this.http.get<{ items: LocalKnowledgeSource[] }>(`${this.api}/sources`);
  }

  listIngestions(params?: { limit?: number }): Observable<{ items: IngestionLogItem[] }> {
    let httpParams = new HttpParams();
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    return this.http.get<{ items: IngestionLogItem[] }>(`${this.api}/ingestions`, { params: httpParams });
  }

  listDocuments(params?: { limit?: number }): Observable<{ items: KnowledgeDocument[] }> {
    let httpParams = new HttpParams();
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    return this.http.get<{ items: KnowledgeDocument[] }>(`${this.api}/documents`, { params: httpParams });
  }

  searchDocuments(query: string): Observable<KnowledgeDocument[]> {
    return this.http.get<KnowledgeDocument[]>(`${this.api}/documents/search`, { params: { q: query } });
  }

  listPublishedKnowledge(params?: { status?: string }): Observable<{ items: PublishedKnowledge[] }> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<{ items: PublishedKnowledge[] }>(`${this.api}/published`, { params: httpParams });
  }

  searchPublishedKnowledge(query: string): Observable<PublishedKnowledge[]> {
    return this.http.get<PublishedKnowledge[]>(`${this.api}/published/search`, { params: { q: query } });
  }
}
