import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

export interface PlaybookDto {
  id: string;
  key: string;
  title: string;
  category?: string;
  severity?: string;
  workflowDefinitionId?: string;
  requirements?: string[];
  knowledgeLinks?: string[];
}

@Injectable({ providedIn: 'root' })
export class PlaybooksApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(workspaceId?: string, tenantId?: string, category?: string): Observable<PlaybookDto[]> {
    const q = new URLSearchParams();
    if (workspaceId) q.set('workspaceId', workspaceId);
    if (tenantId) q.set('tenantId', tenantId);
    if (category) q.set('category', category);
    const query = q.toString();
    return this.http.get<PlaybookDto[]>(`${this.base}/playbooks` + (query ? '?' + query : '')).pipe(
      map((body) => (Array.isArray(body) ? body : []))
    );
  }

  get(id: string): Observable<PlaybookDto> {
    return this.http.get<PlaybookDto>(`${this.base}/playbooks/` + encodeURIComponent(id));
  }

  start(playbookId: string, tenantId?: string, workspaceId?: string, context?: Record<string, string>): Observable<any> {
    return this.http.post(`${this.base}/playbooks/` + encodeURIComponent(playbookId) + '/start', {
      tenantId,
      workspaceId,
      context,
    });
  }
}
